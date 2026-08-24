import type { FastifyPluginAsync } from "fastify";
import type { AppContainer } from "../common/container.js";
import {
  chaveAcessoParamsSchema,
  eventoSeqParamsSchema,
  eventoTipoParamsSchema,
  registrarEventoBodySchema,
} from "./schemas.js";

export const eventosRoutes = (
  container: AppContainer,
): FastifyPluginAsync => {
  return async (app) => {
    app.post("/:chaveAcesso/eventos", async (request, reply) => {
      const params = chaveAcessoParamsSchema.parse(request.params);
      const body = registrarEventoBodySchema.parse(request.body);
      const result = await container.eventosNfseService.registrar({
        chaveAcesso: params.chaveAcesso,
        xmlPedidoEvento: body.xmlPedidoEvento,
      });

      if (result.status === "rejeitado") {
        return reply.status(422).send({
          error: {
            code: "SEFIN_REJECTION",
            message: "Evento rejeitado pela SEFIN",
            details: { body: result.body },
          },
        });
      }

      return reply.status(201).send({
        data: {
          status: result.status,
          payload: result.body,
        },
      });
    });

    app.get("/:chaveAcesso/eventos", async (request, reply) => {
      const params = chaveAcessoParamsSchema.parse(request.params);
      const data = await container.eventosNfseService.listar(params.chaveAcesso);
      return reply.send({ data });
    });

    app.get("/:chaveAcesso/eventos/:tipoEvento", async (request, reply) => {
      const params = eventoTipoParamsSchema.parse(request.params);
      const data = await container.eventosNfseService.listarPorTipo(
        params.chaveAcesso,
        params.tipoEvento,
      );
      return reply.send({ data });
    });

    app.get(
      "/:chaveAcesso/eventos/:tipoEvento/:numSeqEvento",
      async (request, reply) => {
        const params = eventoSeqParamsSchema.parse(request.params);
        const data = await container.eventosNfseService.obter(
          params.chaveAcesso,
          params.tipoEvento,
          params.numSeqEvento,
        );
        return reply.send({ data });
      },
    );
  };
};
