import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDpsId, buildDpsXml } from "./build-dps-xml.js";
import type { DpsJsonInput } from "../entities/nfse.js";

const sample: DpsJsonInput = {
  serie: "1",
  nDPS: "1",
  codigoMunicipio: "3550308",
  prestador: {
    cnpj: "18477718000139",
    opSimpNac: "3",
    regEspTrib: "0",
    regApTribSN: "1",
  },
  tomador: {
    cpf: "39053344705",
    nome: "Tomador Teste",
  },
  servico: {
    cTribNac: "010701",
    descricao: "Consultoria em informatica",
  },
  valores: {
    vServ: 100,
    pTotTribSN: 6,
  },
};

describe("buildDpsId", () => {
  it("monta Id com padding da série e do número", () => {
    assert.equal(
      buildDpsId({
        codigoMunicipio: "3550308",
        tipoInscricao: "2",
        inscricaoFederal: "18477718000139",
        serie: "1",
        nDPS: "1",
      }),
      "DPS355030821847771800013900001000000000000001",
    );
  });
});

describe("buildDpsXml", () => {
  it("gera DPS 1.01 com infDPS.Id e tpAmb=2", () => {
    const xml = buildDpsXml(sample, new Date("2026-08-24T13:00:00-03:00"));
    assert.match(xml, /xmlns="http:\/\/www\.sped\.fazenda\.gov\.br\/nfse"/);
    assert.match(xml, /versao="1\.01"/);
    assert.match(
      xml,
      /Id="DPS355030821847771800013900001000000000000001"/,
    );
    assert.match(xml, /<tpAmb>2<\/tpAmb>/);
    assert.match(xml, /<CNPJ>18477718000139<\/CNPJ>/);
    assert.match(xml, /<opSimpNac>3<\/opSimpNac>/);
    assert.match(xml, /<pTotTribSN>6<\/pTotTribSN>/);
    assert.doesNotMatch(xml, /<Signature/);
  });

  it("gera tpAmb=1 quando o ambiente é produção", () => {
    const xml = buildDpsXml(sample, new Date("2026-08-24T13:00:00-03:00"), "1");
    assert.match(xml, /<tpAmb>1<\/tpAmb>/);
  });
});
