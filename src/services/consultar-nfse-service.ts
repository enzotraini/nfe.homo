import { NotFoundError } from "../errors/domain-errors.js";
import type { NfseGateway } from "../repositories/nfse-gateway.js";

export class ConsultarNfseService {
  constructor(private readonly gateway: NfseGateway) {}

  async execute(chaveAcesso: string) {
    const result = await this.gateway.consultarPorChave(chaveAcesso);

    if (!result.found) {
      throw new NotFoundError("NFS-e não encontrada", { chaveAcesso });
    }

    return {
      chaveAcesso,
      xmlNfse: result.xmlNfse ?? "",
    };
  }
}
