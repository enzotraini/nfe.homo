import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { CertificateError } from "../errors/domain-errors.js";

export type A1Pem = {
  keyPem: string;
  certPem: string;
};

export function loadA1Pem(certPath: string, password: string): A1Pem {
  const absPath = resolve(certPath);
  const pem = opensslPkcs12(absPath, password, false) ?? opensslPkcs12(absPath, password, true);

  if (!pem) {
    throw new CertificateError(
      `Não foi possível abrir o certificado A1 em ${certPath}`,
    );
  }

  const keyPem = pem.match(
    /-----BEGIN [\w ]*PRIVATE KEY-----[\s\S]+?-----END [\w ]*PRIVATE KEY-----/,
  )?.[0];
  const certPem = pem.match(
    /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/,
  )?.[0];

  if (!keyPem || !certPem) {
    throw new CertificateError("A1 sem chave privada ou certificado X509");
  }

  return { keyPem, certPem };
}

function opensslPkcs12(
  absPath: string,
  password: string,
  legacy: boolean,
): string | null {
  try {
    const args = [
      "pkcs12",
      "-in",
      absPath,
      "-nodes",
      "-passin",
      "env:A1_PASS",
    ];
    if (legacy) {
      args.push("-legacy");
    }

    return execFileSync("openssl", args,
      {
        env: { ...process.env, A1_PASS: password },
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch {
    return null;
  }
}
