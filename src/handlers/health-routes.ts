import type { FastifyPluginAsync } from "fastify";
import type { Env } from "../common/env.js";

export const healthRoutes = (env: Env): FastifyPluginAsync => {
  return async (app) => {
    app.get("/health", async () => {
      return {
        status: "ok",
        env: env.NODE_ENV,
        sefinMode: env.SEFIN_MODE,
        sefinEnv: env.SEFIN_ENV,
      };
    });
  };
};
