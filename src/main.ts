import { config } from "dotenv";
config({ override: true });

import { buildApp } from "./common/app.js";
import { createContainer } from "./common/container.js";
import { loadEnv } from "./common/env.js";

async function main() {
  const env = loadEnv();
  const container = createContainer(env);
  const app = await buildApp(container);

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

main();
