import Fastify from "fastify";
import type { AppContainer } from "./container.js";
import { mapErrorToHttp, toLoggableError } from "../errors/error-mapper.js";
import { dpsRoutes } from "../handlers/dps-routes.js";
import { eventosRoutes } from "../handlers/eventos-routes.js";
import { healthRoutes } from "../handlers/health-routes.js";
import { nfseRoutes } from "../handlers/nfse-routes.js";
import { parametrosMunicipaisRoutes } from "../handlers/parametros-municipais-routes.js";

export async function buildApp(container: AppContainer) {
  const app = Fastify({
    logger: true,
  });

  app.setErrorHandler((error, request, reply) => {
    const mapped = mapErrorToHttp(error);

    if (mapped.statusCode >= 500) {
      request.log.error(toLoggableError(error), "Unhandled error");
    } else {
      request.log.warn(toLoggableError(error), "Handled application error");
    }

    return reply.status(mapped.statusCode).send(mapped.body);
  });

  await app.register(healthRoutes(container.env));
  await app.register(nfseRoutes(container), { prefix: "/v1/nfse" });
  await app.register(eventosRoutes(container), { prefix: "/v1/nfse" });
  await app.register(dpsRoutes(container), { prefix: "/v1/dps" });
  await app.register(parametrosMunicipaisRoutes(container), {
    prefix: "/v1/parametros-municipais",
  });

  return app;
}
