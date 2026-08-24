import { z } from "zod";

function trimString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3333),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.preprocess(
    trimString,
    z.enum(["development", "test", "production"]).default("development"),
  ),
  SEFIN_MODE: z.preprocess(
    trimString,
    z.enum(["mock", "http"]).default("mock"),
  ),
  SEFIN_ENV: z.preprocess(
    trimString,
    z.enum(["producao-restrita", "producao"]).default("producao-restrita"),
  ),
  SEFIN_BASE_URL: z.preprocess(
    trimString,
    z
      .string()
      .url()
      .default("https://sefin.producaorestrita.nfse.gov.br/SefinNacional"),
  ),
  SEFIN_CERT_PATH: z.preprocess(
    trimString,
    z.string().min(1).default("./certs/cliente.p12"),
  ),
  SEFIN_CERT_PASSWORD: z.preprocess(trimString, z.string().default("")),
  SEFIN_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Variáveis de ambiente inválidas: ${details}`);
  }

  return parsed.data;
}
