import { gunzipSync, gzipSync } from "node:zlib";

const MAX_GUNZIP_BYTES = 50 * 1024 * 1024;

export function gzipBase64Encode(xml: string): string {
  return gzipSync(Buffer.from(xml, "utf8")).toString("base64");
}

export function gzipBase64DecodeToText(b64: string): string {
  return gunzipSync(Buffer.from(b64, "base64"), {
    maxOutputLength: MAX_GUNZIP_BYTES,
  }).toString("utf8");
}
