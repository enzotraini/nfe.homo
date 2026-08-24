import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { createContainer } from "../common/container.js";
import { loadEnv } from "../common/env.js";
import { SefinMockClient } from "../networks/sefin-mock-client.js";
import { NotFoundError, ValidationError } from "../errors/domain-errors.js";

const sampleDps = `<?xml version="1.0"?>
<DPS>
  <infDPS Id="DPS355030212123456780001905000000000000001">
    <cLocEmi>3550302</cLocEmi>
    <CNPJ>12345678000190</CNPJ>
    <serie>1</serie>
    <nDPS>1</nDPS>
  </infDPS>
</DPS>`;

describe("EmitirNfseService + mock SEFIN", () => {
  let mock: SefinMockClient;

  beforeEach(() => {
    mock = new SefinMockClient();
  });

  it("autoriza DPS válida e permite consulta pela chave", async () => {
    const env = loadEnv({ ...process.env, SEFIN_MODE: "mock" });
    const container = createContainer(env, mock);

    const emitted = await container.emitirNfseService.execute({
      xmlDps: sampleDps,
      regime: "simples",
    });

    assert.equal(emitted.status, "autorizada");
    assert.ok(emitted.xmlNfse?.includes("<chNFSe>"));

    const chaveMatch = emitted.xmlNfse?.match(/<chNFSe>([^<]+)<\/chNFSe>/);
    assert.ok(chaveMatch?.[1]);

    const consulted = await container.consultarNfseService.execute(chaveMatch[1]);
    assert.equal(consulted.chaveAcesso, chaveMatch[1]);
    assert.ok(consulted.xmlNfse.includes(chaveMatch[1]));
  });

  it("rejeita quando XML contém marcador REJEITAR", async () => {
    const env = loadEnv({ ...process.env, SEFIN_MODE: "mock" });
    const container = createContainer(env, mock);

    const result = await container.emitirNfseService.execute({
      xmlDps: `${sampleDps}<motivo>REJEITAR</motivo>`,
    });

    assert.equal(result.status, "rejeitada");
    assert.equal(result.rejection?.statusCode, 422);
  });

  it("monta XML a partir de dps JSON e autoriza no mock", async () => {
    const env = loadEnv({ ...process.env, SEFIN_MODE: "mock" });
    const container = createContainer(env, mock);

    const emitted = await container.emitirNfseService.execute({
      dps: {
        serie: "1",
        nDPS: "2",
        codigoMunicipio: "3550308",
        prestador: {
          cnpj: "18477718000139",
          opSimpNac: "3",
          regEspTrib: "0",
          regApTribSN: "1",
        },
        tomador: { cpf: "39053344705", nome: "Tomador Teste" },
        servico: { cTribNac: "010701", descricao: "Consultoria" },
        valores: { vServ: 100, pTotTribSN: 6 },
      },
    });

    assert.equal(emitted.status, "autorizada");
  });

  it("valida xmlDps vazio", async () => {
    const env = loadEnv({ ...process.env, SEFIN_MODE: "mock" });
    const container = createContainer(env, mock);

    await assert.rejects(
      () => container.emitirNfseService.execute({ xmlDps: "   " }),
      (error: unknown) => error instanceof ValidationError,
    );
  });
});

describe("ConsultarNfseService", () => {
  it("lança NotFound quando chave não existe", async () => {
    const env = loadEnv({ ...process.env, SEFIN_MODE: "mock" });
    const container = createContainer(env, new SefinMockClient());

    await assert.rejects(
      () => container.consultarNfseService.execute("CHAVE_INEXISTENTE"),
      (error: unknown) => error instanceof NotFoundError,
    );
  });
});

describe("ConsultarDpsService + mock", () => {
  it("recupera chave indexada pela identidade da DPS", async () => {
    const mock = new SefinMockClient();
    const env = loadEnv({ ...process.env, SEFIN_MODE: "mock" });
    const container = createContainer(env, mock);

    const emitted = await container.emitirNfseService.execute({ xmlDps: sampleDps });
    const chave = emitted.xmlNfse?.match(/<chNFSe>([^<]+)<\/chNFSe>/)?.[1];
    assert.ok(chave);

    const dps = await container.consultarDpsService.execute({
      codigoMunicipio: "3550302",
      tipoInscricao: "2",
      inscricaoFederal: "12345678000190",
      serie: "1",
      numero: "1",
    });

    assert.equal(dps.chaveAcesso, chave);
  });
});

describe("EventosNfseService + mock", () => {
  it("registra e lista eventos de uma NFS-e emitida", async () => {
    const mock = new SefinMockClient();
    const env = loadEnv({ ...process.env, SEFIN_MODE: "mock" });
    const container = createContainer(env, mock);

    const emitted = await container.emitirNfseService.execute({ xmlDps: sampleDps });
    const chave = emitted.xmlNfse?.match(/<chNFSe>([^<]+)<\/chNFSe>/)?.[1];
    assert.ok(chave);

    const registered = await container.eventosNfseService.registrar({
      chaveAcesso: chave,
      xmlPedidoEvento: "<pedRegEvento><tpEvento>e101101</tpEvento></pedRegEvento>",
    });

    assert.equal(registered.status, "registrado");

    const listed = await container.eventosNfseService.listar(chave);
    assert.ok(listed.payload.includes("e101101"));
  });
});
