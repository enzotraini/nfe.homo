import type {
  ConsultarDpsResult,
  ConsultarNfseResult,
  DpsIdentity,
  EmitirNfseInput,
  EmitirNfseResult,
  ParametrosMunicipaisConsulta,
  RegistrarEventoInput,
  RegistrarEventoResult,
} from "../entities/nfse.js";

export interface NfseGateway {
  emitir(input: EmitirNfseInput): Promise<EmitirNfseResult>;
  consultarPorChave(chaveAcesso: string): Promise<ConsultarNfseResult>;
  consultarDps(id: DpsIdentity): Promise<ConsultarDpsResult>;
  verificarDpsExiste(id: DpsIdentity): Promise<boolean>;
  registrarEvento(input: RegistrarEventoInput): Promise<RegistrarEventoResult>;
  listarEventos(chaveAcesso: string): Promise<string>;
  listarEventosPorTipo(chaveAcesso: string, tipoEvento: string): Promise<string>;
  obterEvento(
    chaveAcesso: string,
    tipoEvento: string,
    numSeqEvento: string,
  ): Promise<string>;
  consultarParametrosMunicipais(
    consulta: ParametrosMunicipaisConsulta,
  ): Promise<string>;
}
