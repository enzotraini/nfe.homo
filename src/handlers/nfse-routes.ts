import type { FastifyPluginAsync } from "fastify";
import type { AppContainer } from "../common/container.js";
import {
  chaveAcessoParamsSchema,
  emitirNfseBodySchema,
} from "./schemas.js";

export const nfseRoutes = (
  container: AppContainer,
): FastifyPluginAsync => {
  return async (app) => {
    app.post("/", async (request, reply) => {
      const body = emitirNfseBodySchema.parse(request.body);
      const result = await container.emitirNfseService.execute({
        ...(body.xmlDps ? { xmlDps: body.xmlDps } : {}),
        ...(body.dps ? { dps: body.dps } : {}),
        ...(body.regime ? { regime: body.regime } : {}),
      });

      if (result.status === "rejeitada") {
        return reply.status(422).send({
          error: {
            code: "SEFIN_REJECTION",
            message: "DPS rejeitada pela SEFIN",
            details: result.rejection,
          },
        });
      }

      return reply.status(201).send({
        data: {
          status: result.status,
          xmlNfse: result.xmlNfse,
          ...(result.chaveAcesso ? { chaveAcesso: result.chaveAcesso } : {}),
          ...(result.idDps ? { idDps: result.idDps } : {}),
        },
      });
    });

    app.get("/:chaveAcesso", async (request, reply) => {
      const params = chaveAcessoParamsSchema.parse(request.params);
      const data = await container.consultarNfseService.execute(
        params.chaveAcesso,
      );
      return reply.send({ data });
    });
  };
};
