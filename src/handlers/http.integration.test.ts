import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildApp } from "../common/app.js";
import { createContainer } from "../common/container.js";
import { loadEnv } from "../common/env.js";
import { SefinMockClient } from "../networks/sefin-mock-client.js";

describe("HTTP API com SEFIN mock", () => {
  it("POST /v1/nfse autoriza e GET consulta", async () => {
    const env = loadEnv({
      ...process.env,
      SEFIN_MODE: "mock",
      NODE_ENV: "test",
    });
    const container = createContainer(env, new SefinMockClient());
    const app = await buildApp(container);

    const emitResponse = await app.inject({
      method: "POST",
      url: "/v1/nfse",
      payload: {
        xmlDps:
          "<DPS><infDPS><cLocEmi>3550302</cLocEmi><CNPJ>12345678000190</CNPJ><serie>1</serie><nDPS>99</nDPS></infDPS></DPS>",
        regime: "mei",
      },
    });

    assert.equal(emitResponse.statusCode, 201);
    const emitBody = emitResponse.json() as {
      data: { status: string; xmlNfse: string };
    };
    assert.equal(emitBody.data.status, "autorizada");

    const chave = emitBody.data.xmlNfse.match(/<chNFSe>([^<]+)<\/chNFSe>/)?.[1];
    assert.ok(chave);

    const getResponse = await app.inject({
      method: "GET",
      url: `/v1/nfse/${chave}`,
    });

    assert.equal(getResponse.statusCode, 200);
    await app.close();
  });

  it("POST /v1/nfse sem xmlDps retorna 400", async () => {
    const env = loadEnv({
      ...process.env,
      SEFIN_MODE: "mock",
      NODE_ENV: "test",
    });
    const app = await buildApp(createContainer(env, new SefinMockClient()));

    const response = await app.inject({
      method: "POST",
      url: "/v1/nfse",
      payload: {},
    });

    assert.equal(response.statusCode, 400);
    const body = response.json() as { error: { code: string } };
    assert.equal(body.error.code, "VALIDATION_ERROR");
    await app.close();
  });

  it("GET /health expõe sefinMode=mock", async () => {
    const env = loadEnv({
      ...process.env,
      SEFIN_MODE: "mock",
      NODE_ENV: "test",
    });
    const app = await buildApp(createContainer(env, new SefinMockClient()));

    const response = await app.inject({ method: "GET", url: "/health" });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { sefinMode: string };
    assert.equal(body.sefinMode, "mock");
    await app.close();
  });
});
