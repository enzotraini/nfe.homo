import { z } from "zod";

export const regimeTributarioSchema = z.enum([
  "mei",
  "simples",
  "lucro_presumido",
  "lucro_real",
  "outro",
]);

export const dpsJsonSchema = z.object({
  serie: z.string().regex(/^(?:[0-9]{1,4}|[0-8][0-9]{4})$/),
  nDPS: z.string().regex(/^[1-9]\d{0,14}$/),
  codigoMunicipio: z.string().regex(/^\d{7}$/),
  prestador: z.object({
    cnpj: z.string().regex(/^\d{14}$/),
    im: z.string().min(1).optional(),
    opSimpNac: z.enum(["1", "2", "3"]),
    regEspTrib: z.string().default("0"),
    regApTribSN: z.enum(["1", "2", "3"]).optional(),
  }),
  tomador: z
    .object({
      cpf: z.string().regex(/^\d{11}$/).optional(),
      cnpj: z.string().regex(/^\d{14}$/).optional(),
      nome: z.string().min(1),
    })
    .refine((tomador) => Boolean(tomador.cpf) !== Boolean(tomador.cnpj), {
      message: "Informe CPF ou CNPJ do tomador",
    }),
  servico: z.object({
    cTribNac: z.string().regex(/^\d{6}$/),
    descricao: z.string().min(1),
    codigoMunicipioPrestacao: z.string().regex(/^\d{7}$/).optional(),
    cTribMun: z.string().regex(/^\d{3}$/).optional(),
  }),
  valores: z.object({
    vServ: z.number().positive(),
    pTotTribSN: z.number().nonnegative().optional(),
    pTotTrib: z
      .object({
        pTotTribFed: z.number().nonnegative(),
        pTotTribEst: z.number().nonnegative(),
        pTotTribMun: z.number().nonnegative(),
      })
      .optional(),
  }),
});

export const emitirNfseBodySchema = z
  .object({
    xmlDps: z.string().min(1).optional(),
    dps: dpsJsonSchema.optional(),
    regime: regimeTributarioSchema.optional(),
  })
  .refine((body) => Boolean(body.xmlDps) || Boolean(body.dps), {
    message: "Informe xmlDps ou dps",
  });

export const chaveAcessoParamsSchema = z.object({
  chaveAcesso: z.string().min(1),
});

export const dpsParamsSchema = z.object({
  codigoMunicipio: z.string().regex(/^\d{7}$/),
  tipoInscricao: z.enum(["1", "2"]),
  inscricaoFederal: z.string().min(11).max(18),
  serie: z.string().min(1).max(5),
  numero: z.string().min(1).max(15),
});

export const registrarEventoBodySchema = z.object({
  xmlPedidoEvento: z.string().min(1),
});

export const eventoTipoParamsSchema = z.object({
  chaveAcesso: z.string().min(1),
  tipoEvento: z.string().min(1),
});

export const eventoSeqParamsSchema = z.object({
  chaveAcesso: z.string().min(1),
  tipoEvento: z.string().min(1),
  numSeqEvento: z.string().min(1),
});

export const municipioParamsSchema = z.object({
  codigoMunicipio: z.string().regex(/^\d{7}$/),
});

export const municipioServicoParamsSchema = z.object({
  codigoMunicipio: z.string().regex(/^\d{7}$/),
  codigoServico: z.string().min(1),
});

export const municipioContribuinteParamsSchema = z.object({
  codigoMunicipio: z.string().regex(/^\d{7}$/),
  cpfCnpj: z.string().min(11).max(18),
});
