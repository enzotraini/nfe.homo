import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gzipBase64DecodeToText, gzipBase64Encode } from "./gzip-b64.js";

describe("gzip-b64", () => {
  it("round-trip UTF-8", () => {
    const xml = '<?xml version="1.0"?><DPS>ação</DPS>';
    assert.equal(gzipBase64DecodeToText(gzipBase64Encode(xml)), xml);
  });
});
