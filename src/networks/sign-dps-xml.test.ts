import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { buildDpsXml } from "../services/build-dps-xml.js";
import { isDpsSigned, signDpsXml } from "./sign-dps-xml.js";
import type { DpsJsonInput } from "../entities/nfse.js";

describe("signDpsXml", () => {
  it("anexa Signature XMLDSig no DPS", () => {
    const dir = mkdtempSync(join(tmpdir(), "nfse-sign-"));
    try {
      const keyPath = join(dir, "key.pem");
      const certPath = join(dir, "cert.pem");
      execFileSync("openssl", [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-keyout",
        keyPath,
        "-out",
        certPath,
        "-days",
        "1",
        "-nodes",
        "-subj",
        "/CN=teste",
      ]);

      const dps: DpsJsonInput = {
        serie: "1",
        nDPS: "1",
        codigoMunicipio: "3550308",
        prestador: {
          cnpj: "18477718000139",
          opSimpNac: "3",
          regEspTrib: "0",
          regApTribSN: "1",
        },
        tomador: { cpf: "39053344705", nome: "Tomador" },
        servico: { cTribNac: "010701", descricao: "Teste" },
        valores: { vServ: 10, pTotTribSN: 6 },
      };

      const xml = buildDpsXml(dps);
      const signed = signDpsXml(xml, {
        keyPem: readFileSync(keyPath, "utf8"),
        certPem: readFileSync(certPath, "utf8"),
      });

      assert.equal(isDpsSigned(xml), false);
      assert.equal(isDpsSigned(signed), true);
      assert.match(signed, /<Signature/);
      assert.match(signed, /rsa-sha256/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
