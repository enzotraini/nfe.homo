import type { FastifyPluginAsync } from "fastify";
import type { AppContainer } from "../common/container.js";
import { dpsParamsSchema } from "./schemas.js";

export const dpsRoutes = (container: AppContainer): FastifyPluginAsync => {
  return async (app) => {
    app.route({
      method: "GET",
      url: "/:codigoMunicipio/:tipoInscricao/:inscricaoFederal/:serie/:numero",
      exposeHeadRoute: false,
      handler: async (request, reply) => {
        const params = dpsParamsSchema.parse(request.params);
        const data = await container.consultarDpsService.execute(params);
        return reply.send({ data });
      },
    });

    app.head(
      "/:codigoMunicipio/:tipoInscricao/:inscricaoFederal/:serie/:numero",
      async (request, reply) => {
        const params = dpsParamsSchema.parse(request.params);
        const result = await container.consultarDpsService.exists(params);

        if (!result.exists) {
          return reply.status(404).send();
        }

        return reply.status(204).send();
      },
    );
  };
};
