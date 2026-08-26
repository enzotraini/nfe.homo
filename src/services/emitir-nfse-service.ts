import { ValidationError } from "../errors/domain-errors.js";
import type { NfseGateway } from "../repositories/nfse-gateway.js";
import type { EmitirNfseInput, EmitirNfseResult } from "../entities/nfse.js";
import { buildDpsXml, type TipoAmbienteSefin } from "./build-dps-xml.js";

export class EmitirNfseService {
  constructor(
    private readonly gateway: NfseGateway,
    private readonly tpAmb: TipoAmbienteSefin = "2",
  ) {}

  async execute(input: EmitirNfseInput): Promise<EmitirNfseResult> {
    const xmlDps = this.resolveXml(input);

    return this.gateway.emitir({
      xmlDps,
      ...(input.dps ? { dps: input.dps } : {}),
      ...(input.regime ? { regime: input.regime } : {}),
    });
  }

  private resolveXml(input: EmitirNfseInput): string {
    const raw = input.xmlDps?.trim();
    if (raw) {
      if (!raw.includes("<")) {
        throw new ValidationError("xmlDps deve ser um XML válido da DPS");
      }
      return raw;
    }

    if (input.dps) {
      return buildDpsXml(input.dps, new Date(), this.tpAmb);
    }

    throw new ValidationError("Informe xmlDps ou dps");
  }
}
