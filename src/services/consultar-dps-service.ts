import { NotFoundError, ValidationError } from "../errors/domain-errors.js";
import type { DpsIdentity } from "../entities/nfse.js";
import type { NfseGateway } from "../repositories/nfse-gateway.js";

export class ConsultarDpsService {
  constructor(private readonly gateway: NfseGateway) {}

  async execute(id: DpsIdentity) {
    this.assertIdentity(id);
    const result = await this.gateway.consultarDps(id);

    if (!result.exists) {
      throw new NotFoundError("DPS não encontrada", { id });
    }

    return {
      id,
      chaveAcesso: result.chaveAcesso,
    };
  }

  async exists(id: DpsIdentity): Promise<{ exists: boolean }> {
    this.assertIdentity(id);
    const exists = await this.gateway.verificarDpsExiste(id);
    return { exists };
  }

  private assertIdentity(id: DpsIdentity): void {
    if (!/^\d{7}$/.test(id.codigoMunicipio)) {
      throw new ValidationError("codigoMunicipio deve ter 7 dígitos IBGE");
    }
    if (id.tipoInscricao !== "1" && id.tipoInscricao !== "2") {
      throw new ValidationError("tipoInscricao deve ser 1 (CPF) ou 2 (CNPJ)");
    }
    if (!id.serie || !id.numero || !id.inscricaoFederal) {
      throw new ValidationError(
        "serie, numero e inscricaoFederal são obrigatórios",
      );
    }
  }
}
