import type { Env } from "./env.js";
import { SefinHttpClient } from "../networks/sefin-http-client.js";
import { SefinMockClient } from "../networks/sefin-mock-client.js";
import type { NfseGateway } from "../repositories/nfse-gateway.js";
import { ConsultarDpsService } from "../services/consultar-dps-service.js";
import { ConsultarNfseService } from "../services/consultar-nfse-service.js";
import { EmitirNfseService } from "../services/emitir-nfse-service.js";
import { EventosNfseService } from "../services/eventos-nfse-service.js";
import { ParametrosMunicipaisService } from "../services/parametros-municipais-service.js";

export type AppContainer = {
  env: Env;
  gateway: NfseGateway;
  emitirNfseService: EmitirNfseService;
  consultarNfseService: ConsultarNfseService;
  consultarDpsService: ConsultarDpsService;
  eventosNfseService: EventosNfseService;
  parametrosMunicipaisService: ParametrosMunicipaisService;
};

export function createGateway(env: Env): NfseGateway {
  if (env.SEFIN_MODE === "mock") {
    return new SefinMockClient();
  }

  return new SefinHttpClient({ env });
}

export function createContainer(
  env: Env,
  gateway: NfseGateway = createGateway(env),
): AppContainer {
  return {
    env,
    gateway,
    emitirNfseService: new EmitirNfseService(gateway),
    consultarNfseService: new ConsultarNfseService(gateway),
    consultarDpsService: new ConsultarDpsService(gateway),
    eventosNfseService: new EventosNfseService(gateway),
    parametrosMunicipaisService: new ParametrosMunicipaisService(gateway),
  };
}
