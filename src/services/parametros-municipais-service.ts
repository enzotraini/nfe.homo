import { ValidationError } from "../errors/domain-errors.js";
import type { ParametrosMunicipaisConsulta } from "../entities/nfse.js";
import type { NfseGateway } from "../repositories/nfse-gateway.js";

export class ParametrosMunicipaisService {
  constructor(private readonly gateway: NfseGateway) {}

  async execute(consulta: ParametrosMunicipaisConsulta) {
    if (!/^\d{7}$/.test(consulta.codigoMunicipio)) {
      throw new ValidationError("codigoMunicipio deve ter 7 dígitos IBGE");
    }

    if (consulta.kind === "servico" && !consulta.codigoServico.trim()) {
      throw new ValidationError("codigoServico é obrigatório");
    }

    if (consulta.kind === "contribuinte" && !consulta.cpfCnpj.trim()) {
      throw new ValidationError("cpfCnpj é obrigatório");
    }

    const payload =
      await this.gateway.consultarParametrosMunicipais(consulta);

    return { consulta, payload };
  }
}
