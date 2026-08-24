import { readFileSync } from "node:fs";
import { Agent, request } from "undici";
import { gzipBase64DecodeToText, gzipBase64Encode } from "../common/gzip-b64.js";
import type { Env } from "../common/env.js";
import type {
  ConsultarDpsResult,
  ConsultarNfseResult,
  DpsIdentity,
  EmitirNfseInput,
  EmitirNfseResult,
  ParametrosMunicipaisConsulta,
  RegistrarEventoInput,
  RegistrarEventoResult,
} from "../entities/nfse.js";
import {
  CertificateError,
  SefinRejectionError,
  SefinUnavailableError,
} from "../errors/domain-errors.js";
import type { NfseGateway } from "../repositories/nfse-gateway.js";
import { loadA1Pem, type A1Pem } from "./a1-certificate.js";
import { signDpsXml } from "./sign-dps-xml.js";

type SefinHttpClientOptions = {
  env: Env;
};

type HttpMethod = "GET" | "POST" | "HEAD";

type HttpCallResult = {
  statusCode: number;
  body: string;
};

/**
 * Adaptador HTTP (mTLS) para a Sefin Nacional NFS-e.
 * Fonte: DOC.MD — Manual dos Contribuintes + Swagger SEFIN.
 */
export class SefinHttpClient implements NfseGateway {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly env: Env;
  private agent: Agent | null = null;
  private certificate: A1Pem | null = null;

  constructor(options: SefinHttpClientOptions) {
    this.env = options.env;
    this.baseUrl = options.env.SEFIN_BASE_URL.replace(/\/$/, "");
    this.timeoutMs = options.env.SEFIN_TIMEOUT_MS;
  }

  async emitir(input: EmitirNfseInput): Promise<EmitirNfseResult> {
    if (!input.xmlDps) {
      throw new SefinUnavailableError("XML da DPS ausente no cliente HTTP");
    }

    const signed = signDpsXml(input.xmlDps, this.getCertificate());
    const result = await this.call("POST", "/nfse", {
      body: JSON.stringify({ dpsXmlGZipB64: gzipBase64Encode(signed) }),
      contentType: "application/json",
    });

    if (result.statusCode >= 200 && result.statusCode < 300) {
      const json = parseJsonObject(result.body);
      const packed = json ? readString(json, "nfseXmlGZipB64") : undefined;
      const chaveAcesso = json ? readString(json, "chaveAcesso") : undefined;
      const idDps = json ? readString(json, "idDps") : undefined;
      return {
        status: "autorizada",
        xmlNfse: packed ? gzipBase64DecodeToText(packed) : result.body,
        ...(chaveAcesso ? { chaveAcesso } : {}),
        ...(idDps ? { idDps } : {}),
      };
    }

    if (result.statusCode >= 400 && result.statusCode < 500) {
      return {
        status: "rejeitada",
        rejection: {
          statusCode: result.statusCode,
          body: result.body,
        },
      };
    }

    throw new SefinUnavailableError(
      `SEFIN retornou status inesperado na emissão: ${result.statusCode}`,
    );
  }

  async consultarPorChave(chaveAcesso: string): Promise<ConsultarNfseResult> {
    const result = await this.call(
      "GET",
      `/nfse/${encodeURIComponent(chaveAcesso)}`,
    );

    if (result.statusCode === 404) {
      return { found: false };
    }

    if (result.statusCode >= 200 && result.statusCode < 300) {
      const json = parseJsonObject(result.body);
      const packed = json ? readString(json, "nfseXmlGZipB64") : undefined;
      return {
        found: true,
        xmlNfse: packed ? gzipBase64DecodeToText(packed) : result.body,
      };
    }

    if (result.statusCode >= 400 && result.statusCode < 500) {
      throw new SefinRejectionError("Consulta de NFS-e rejeitada pela SEFIN", {
        statusCode: result.statusCode,
        body: result.body,
      });
    }

    throw new SefinUnavailableError(
      `SEFIN retornou status inesperado na consulta: ${result.statusCode}`,
    );
  }

  async consultarDps(id: DpsIdentity): Promise<ConsultarDpsResult> {
    const result = await this.call("GET", `/dps/${this.buildDpsId(id)}`);

    if (result.statusCode === 404) {
      return { exists: false };
    }

    if (result.statusCode >= 200 && result.statusCode < 300) {
      const json = parseJsonObject(result.body);
      const chave = json ? readString(json, "chaveAcesso") : result.body.trim();
      return {
        exists: true,
        chaveAcesso: chave && chave.length > 0 ? chave : null,
      };
    }

    if (result.statusCode >= 400 && result.statusCode < 500) {
      throw new SefinRejectionError("Consulta de DPS rejeitada pela SEFIN", {
        statusCode: result.statusCode,
        body: result.body,
      });
    }

    throw new SefinUnavailableError(
      `SEFIN retornou status inesperado na consulta de DPS: ${result.statusCode}`,
    );
  }

  async verificarDpsExiste(id: DpsIdentity): Promise<boolean> {
    const result = await this.call("HEAD", `/dps/${this.buildDpsId(id)}`);

    if (result.statusCode === 404) {
      return false;
    }

    if (result.statusCode >= 200 && result.statusCode < 300) {
      return true;
    }

    throw new SefinUnavailableError(
      `SEFIN retornou status inesperado no HEAD de DPS: ${result.statusCode}`,
    );
  }

  async registrarEvento(
    input: RegistrarEventoInput,
  ): Promise<RegistrarEventoResult> {
    const path = `/nfse/${encodeURIComponent(input.chaveAcesso)}/eventos`;
    const result = await this.call("POST", path, {
      body: JSON.stringify({
        pedidoRegistroEventoXmlGZipB64: gzipBase64Encode(input.xmlPedidoEvento),
      }),
      contentType: "application/json",
    });

    if (result.statusCode >= 200 && result.statusCode < 300) {
      return { status: "registrado", body: result.body };
    }

    if (result.statusCode >= 400 && result.statusCode < 500) {
      return { status: "rejeitado", body: result.body };
    }

    throw new SefinUnavailableError(
      `SEFIN retornou status inesperado no registro de evento: ${result.statusCode}`,
    );
  }

  async listarEventos(chaveAcesso: string): Promise<string> {
    return this.getOrThrow(
      `/nfse/${encodeURIComponent(chaveAcesso)}/eventos`,
      "listagem de eventos",
    );
  }

  async listarEventosPorTipo(
    chaveAcesso: string,
    tipoEvento: string,
  ): Promise<string> {
    return this.getOrThrow(
      `/nfse/${encodeURIComponent(chaveAcesso)}/eventos/${encodeURIComponent(tipoEvento)}`,
      "listagem de eventos por tipo",
    );
  }

  async obterEvento(
    chaveAcesso: string,
    tipoEvento: string,
    numSeqEvento: string,
  ): Promise<string> {
    return this.getOrThrow(
      `/nfse/${encodeURIComponent(chaveAcesso)}/eventos/${encodeURIComponent(tipoEvento)}/${encodeURIComponent(numSeqEvento)}`,
      "consulta de evento específico",
    );
  }

  async consultarParametrosMunicipais(
    consulta: ParametrosMunicipaisConsulta,
  ): Promise<string> {
    return this.getOrThrow(
      this.buildParametrosPath(consulta),
      "parâmetros municipais",
    );
  }

  private buildParametrosPath(consulta: ParametrosMunicipaisConsulta): string {
    switch (consulta.kind) {
      case "convenio":
        return `/parametros_municipais/${encodeURIComponent(consulta.codigoMunicipio)}/convenio`;
      case "servico":
        return `/parametros_municipais/${encodeURIComponent(consulta.codigoMunicipio)}/${encodeURIComponent(consulta.codigoServico)}`;
      case "contribuinte":
        return `/parametros_municipais/${encodeURIComponent(consulta.codigoMunicipio)}/${encodeURIComponent(consulta.cpfCnpj)}`;
    }
  }

  private buildDpsId(id: DpsIdentity): string {
    const inscricao = id.inscricaoFederal.replace(/\D/g, "").padStart(14, "0");
    return `${id.codigoMunicipio}${id.tipoInscricao}${inscricao}${id.serie.padStart(5, "0")}${id.numero.padStart(15, "0")}`;
  }

  private async getOrThrow(path: string, label: string): Promise<string> {
    const result = await this.call("GET", path);

    if (result.statusCode >= 200 && result.statusCode < 300) {
      return result.body;
    }

    if (result.statusCode === 404) {
      throw new SefinRejectionError(
        `Recurso não encontrado na SEFIN (${label})`,
        {
          statusCode: result.statusCode,
          body: result.body,
        },
      );
    }

    if (result.statusCode >= 400 && result.statusCode < 500) {
      throw new SefinRejectionError(`SEFIN rejeitou ${label}`, {
        statusCode: result.statusCode,
        body: result.body,
      });
    }

    throw new SefinUnavailableError(
      `SEFIN indisponível em ${label}: status ${result.statusCode}`,
    );
  }

  private async call(
    method: HttpMethod,
    path: string,
    options?: { body?: string; contentType?: string },
  ): Promise<HttpCallResult> {
    const url = `${this.baseUrl}${path}`;
    const agent = this.getAgent();

    try {
      const response = await request(url, {
        method,
        ...(options?.body
          ? {
              body: options.body,
              headers: {
                "content-type": options.contentType ?? "application/json",
                accept: "application/json, application/xml, text/plain, */*",
              },
            }
          : {
              headers: {
                accept: "application/json, application/xml, text/plain, */*",
              },
            }),
        dispatcher: agent,
        headersTimeout: this.timeoutMs,
        bodyTimeout: this.timeoutMs,
      });

      const body = await response.body.text();
      return {
        statusCode: response.statusCode,
        body,
      };
    } catch (error) {
      if (error instanceof CertificateError) {
        throw error;
      }

      throw new SefinUnavailableError(
        `Falha de comunicação com a SEFIN em ${method} ${path}`,
        error,
      );
    }
  }

  private getAgent(): Agent {
    if (this.agent) {
      return this.agent;
    }

    try {
      const pfx = readFileSync(this.env.SEFIN_CERT_PATH);
      this.agent = new Agent({
        connect: {
          pfx,
          ...(this.env.SEFIN_CERT_PASSWORD
            ? { passphrase: this.env.SEFIN_CERT_PASSWORD }
            : {}),
          rejectUnauthorized: true,
          allowH2: false,
          ALPNProtocols: ["http/1.1"],
        },
        bodyTimeout: this.timeoutMs,
        headersTimeout: this.timeoutMs,
      });
      return this.agent;
    } catch (error) {
      throw new CertificateError(
        `Não foi possível carregar o certificado em ${this.env.SEFIN_CERT_PATH}`,
        error,
      );
    }
  }

  private getCertificate(): A1Pem {
    if (!this.certificate) {
      this.certificate = loadA1Pem(
        this.env.SEFIN_CERT_PATH,
        this.env.SEFIN_CERT_PASSWORD,
      );
    }
    return this.certificate;
  }
}

function parseJsonObject(body: string): Record<string, unknown> | null {
  const trimmed = body.trim();
  if (!trimmed.startsWith("{")) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

function readString(
  obj: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = obj[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
