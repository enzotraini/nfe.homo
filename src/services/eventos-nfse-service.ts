import { ValidationError } from "../errors/domain-errors.js";
import type { RegistrarEventoInput } from "../entities/nfse.js";
import type { NfseGateway } from "../repositories/nfse-gateway.js";

export class EventosNfseService {
  constructor(private readonly gateway: NfseGateway) {}

  async registrar(input: RegistrarEventoInput) {
    if (!input.chaveAcesso.trim()) {
      throw new ValidationError("chaveAcesso é obrigatória");
    }
    if (!input.xmlPedidoEvento.trim().includes("<")) {
      throw new ValidationError(
        "xmlPedidoEvento deve ser um XML válido do pedido de evento",
      );
    }

    return this.gateway.registrarEvento(input);
  }

  async listar(chaveAcesso: string) {
    return {
      chaveAcesso,
      payload: await this.gateway.listarEventos(chaveAcesso),
    };
  }

  async listarPorTipo(chaveAcesso: string, tipoEvento: string) {
    return {
      chaveAcesso,
      tipoEvento,
      payload: await this.gateway.listarEventosPorTipo(chaveAcesso, tipoEvento),
    };
  }

  async obter(chaveAcesso: string, tipoEvento: string, numSeqEvento: string) {
    return {
      chaveAcesso,
      tipoEvento,
      numSeqEvento,
      payload: await this.gateway.obterEvento(
        chaveAcesso,
        tipoEvento,
        numSeqEvento,
      ),
    };
  }
}
