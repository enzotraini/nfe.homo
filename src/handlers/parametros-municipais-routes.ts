import type { FastifyPluginAsync } from "fastify";
import type { AppContainer } from "../common/container.js";
import {
  municipioContribuinteParamsSchema,
  municipioParamsSchema,
  municipioServicoParamsSchema,
} from "./schemas.js";

export const parametrosMunicipaisRoutes = (
  container: AppContainer,
): FastifyPluginAsync => {
  return async (app) => {
    app.get("/:codigoMunicipio/convenio", async (request, reply) => {
      const params = municipioParamsSchema.parse(request.params);
      const data = await container.parametrosMunicipaisService.execute({
        kind: "convenio",
        codigoMunicipio: params.codigoMunicipio,
      });
      return reply.send({ data });
    });

    app.get("/:codigoMunicipio/servico/:codigoServico", async (request, reply) => {
      const params = municipioServicoParamsSchema.parse(request.params);
      const data = await container.parametrosMunicipaisService.execute({
        kind: "servico",
        codigoMunicipio: params.codigoMunicipio,
        codigoServico: params.codigoServico,
      });
      return reply.send({ data });
    });

    app.get("/:codigoMunicipio/contribuinte/:cpfCnpj", async (request, reply) => {
      const params = municipioContribuinteParamsSchema.parse(request.params);
      const data = await container.parametrosMunicipaisService.execute({
        kind: "contribuinte",
        codigoMunicipio: params.codigoMunicipio,
        cpfCnpj: params.cpfCnpj,
      });
      return reply.send({ data });
    });
  };
};
