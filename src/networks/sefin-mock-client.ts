import { createHash, randomUUID } from "node:crypto";
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
import { SefinRejectionError } from "../errors/domain-errors.js";
import type { NfseGateway } from "../repositories/nfse-gateway.js";

type StoredNfse = {
  chaveAcesso: string;
  xmlDps: string;
  xmlNfse: string;
  dpsId: string;
  eventos: Array<{
    tipoEvento: string;
    numSeqEvento: string;
    xml: string;
  }>;
};

/**
 * Gateway em memória para desenvolvimento/testes sem certificado A1.
 * Troque SEFIN_MODE=http quando o .pfx estiver disponível.
 */
export class SefinMockClient implements NfseGateway {
  private readonly notes = new Map<string, StoredNfse>();
  private readonly dpsIndex = new Map<string, string>();

  async emitir(input: EmitirNfseInput): Promise<EmitirNfseResult> {
    const xmlDps = input.xmlDps ?? "";
    if (xmlDps.includes("REJEITAR")) {
      return {
        status: "rejeitada",
        rejection: {
          statusCode: 422,
          body: JSON.stringify({
            mensagem: "Mock: DPS rejeitada (marcador REJEITAR)",
          }),
        },
      };
    }

    const chaveAcesso = this.buildChaveAcesso(xmlDps);
    const dpsId = this.extractDpsId(xmlDps) ?? `mock-dps-${chaveAcesso}`;
    const xmlNfse = this.buildNfseXml(chaveAcesso, xmlDps);

    const stored: StoredNfse = {
      chaveAcesso,
      xmlDps,
      xmlNfse,
      dpsId,
      eventos: [],
    };

    this.notes.set(chaveAcesso, stored);
    this.dpsIndex.set(dpsId, chaveAcesso);

    return {
      status: "autorizada",
      xmlNfse,
    };
  }

  async consultarPorChave(chaveAcesso: string): Promise<ConsultarNfseResult> {
    const note = this.notes.get(chaveAcesso);
    if (!note) {
      return { found: false };
    }

    return {
      found: true,
      xmlNfse: note.xmlNfse,
    };
  }

  async consultarDps(id: DpsIdentity): Promise<ConsultarDpsResult> {
    const dpsId = this.composeDpsId(id);
    const chave = this.dpsIndex.get(dpsId);

    if (!chave) {
      return { exists: false };
    }

    return {
      exists: true,
      chaveAcesso: chave,
    };
  }

  async verificarDpsExiste(id: DpsIdentity): Promise<boolean> {
    return this.dpsIndex.has(this.composeDpsId(id));
  }

  async registrarEvento(
    input: RegistrarEventoInput,
  ): Promise<RegistrarEventoResult> {
    const note = this.notes.get(input.chaveAcesso);
    if (!note) {
      return {
        status: "rejeitado",
        body: JSON.stringify({
          mensagem: "Mock: NFS-e inexistente para registrar evento",
        }),
      };
    }

    if (input.xmlPedidoEvento.includes("REJEITAR")) {
      return {
        status: "rejeitado",
        body: JSON.stringify({
          mensagem: "Mock: evento rejeitado (marcador REJEITAR)",
        }),
      };
    }

    const tipoEvento = this.extractTag(input.xmlPedidoEvento, "tpEvento") ?? "e101101";
    const sameType = note.eventos.filter((evento) => evento.tipoEvento === tipoEvento);
    const numSeqEvento = String(sameType.length + 1);
    const xml = `<Evento><chNFSe>${input.chaveAcesso}</chNFSe><tpEvento>${tipoEvento}</tpEvento><nSeqEvento>${numSeqEvento}</nSeqEvento></Evento>`;

    note.eventos.push({ tipoEvento, numSeqEvento, xml });

    return {
      status: "registrado",
      body: xml,
    };
  }

  async listarEventos(chaveAcesso: string): Promise<string> {
    const note = this.requireNote(chaveAcesso);
    return `<Eventos>${note.eventos.map((evento) => evento.xml).join("")}</Eventos>`;
  }

  async listarEventosPorTipo(
    chaveAcesso: string,
    tipoEvento: string,
  ): Promise<string> {
    const note = this.requireNote(chaveAcesso);
    const filtered = note.eventos.filter((evento) => evento.tipoEvento === tipoEvento);
    return `<Eventos>${filtered.map((evento) => evento.xml).join("")}</Eventos>`;
  }

  async obterEvento(
    chaveAcesso: string,
    tipoEvento: string,
    numSeqEvento: string,
  ): Promise<string> {
    const note = this.requireNote(chaveAcesso);
    const evento = note.eventos.find(
      (item) =>
        item.tipoEvento === tipoEvento && item.numSeqEvento === numSeqEvento,
    );

    if (!evento) {
      throw new SefinRejectionError("Mock: evento não encontrado", {
        chaveAcesso,
        tipoEvento,
        numSeqEvento,
      });
    }

    return evento.xml;
  }

  async consultarParametrosMunicipais(
    consulta: ParametrosMunicipaisConsulta,
  ): Promise<string> {
    return JSON.stringify({
      mock: true,
      consulta,
      aliquota: 5,
      convenioAtivo: true,
    });
  }

  /** Útil nos testes para indexar DPS com id conhecido. */
  indexDps(id: DpsIdentity, chaveAcesso: string): void {
    this.dpsIndex.set(this.composeDpsId(id), chaveAcesso);
  }

  clear(): void {
    this.notes.clear();
    this.dpsIndex.clear();
  }

  private requireNote(chaveAcesso: string): StoredNfse {
    const note = this.notes.get(chaveAcesso);
    if (!note) {
      throw new SefinRejectionError("Mock: NFS-e não encontrada", {
        chaveAcesso,
      });
    }
    return note;
  }

  private composeDpsId(id: DpsIdentity): string {
    const inscricao = id.inscricaoFederal.replace(/\D/g, "").padStart(14, "0");
    return `${id.codigoMunicipio}${id.tipoInscricao}${inscricao}${id.serie.padStart(5, "0")}${id.numero.padStart(15, "0")}`;
  }

  private extractDpsId(xmlDps: string): string | null {
    const explicit = this.extractTag(xmlDps, "Id");
    if (explicit) {
      return explicit;
    }

    const codigoMunicipio = this.extractTag(xmlDps, "cLocEmi");
    const inscricao = this.extractTag(xmlDps, "CNPJ") ?? this.extractTag(xmlDps, "CPF");
    const serie = this.extractTag(xmlDps, "serie");
    const numero = this.extractTag(xmlDps, "nDPS");

    if (!codigoMunicipio || !inscricao || !serie || !numero) {
      return null;
    }

    const digits = inscricao.replace(/\D/g, "");
    const tipo = digits.length > 11 ? "2" : "1";

    return this.composeDpsId({
      codigoMunicipio,
      tipoInscricao: tipo,
      inscricaoFederal: digits,
      serie,
      numero,
    });
  }

  private extractTag(xml: string, tag: string): string | null {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "i"));
    return match?.[1]?.trim() ?? null;
  }

  private buildChaveAcesso(xmlDps: string): string {
    const digest = createHash("sha256")
      .update(xmlDps)
      .update(randomUUID())
      .digest("hex")
      .slice(0, 44)
      .toUpperCase();
    return digest;
  }

  private buildNfseXml(chaveAcesso: string, xmlDps: string): string {
    return `<NFSe><infNFSe><chNFSe>${chaveAcesso}</chNFSe></infNFSe><DPS>${xmlDps}</DPS></NFSe>`;
  }
}
