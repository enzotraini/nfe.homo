import { SignedXml } from "xml-crypto";
import { CertificateError } from "../errors/domain-errors.js";
import type { A1Pem } from "./a1-certificate.js";

const SIGNATURE_ALGORITHM = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
const CANONICALIZATION_ALGORITHM = "http://www.w3.org/2001/10/xml-exc-c14n#";
const DIGEST_ALGORITHM = "http://www.w3.org/2001/04/xmlenc#sha256";
const TRANSFORM_ENVELOPED = "http://www.w3.org/2000/09/xmldsig#enveloped-signature";
const TRANSFORM_EXC_C14N = "http://www.w3.org/2001/10/xml-exc-c14n#";

export function isDpsSigned(xml: string): boolean {
  return /<Signature\b[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/09\/xmldsig#"/u.test(
    xml,
  );
}

export function signDpsXml(xml: string, certificate: A1Pem): string {
  if (isDpsSigned(xml)) {
    return xml;
  }

  const id = xml.match(/<infDPS\b[^>]*\bId="([^"]+)"/u)?.[1];
  if (!id) {
    throw new CertificateError("DPS sem atributo infDPS.Id; não é possível assinar");
  }

  const sig = new SignedXml({
    privateKey: certificate.keyPem,
    publicCert: certificate.certPem,
    signatureAlgorithm: SIGNATURE_ALGORITHM,
    canonicalizationAlgorithm: CANONICALIZATION_ALGORITHM,
  });

  sig.addReference({
    xpath: "//*[local-name(.)='infDPS']",
    transforms: [TRANSFORM_ENVELOPED, TRANSFORM_EXC_C14N],
    digestAlgorithm: DIGEST_ALGORITHM,
    uri: `#${id}`,
  });

  sig.computeSignature(xml, {
    location: { reference: "//*[local-name(.)='DPS']", action: "append" },
  });

  return sig.getSignedXml();
}
