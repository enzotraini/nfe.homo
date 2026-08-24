export type RegimeTributario =
  | "mei"
  | "simples"
  | "lucro_presumido"
  | "lucro_real"
  | "outro";

export type TipoInscricaoFederal = "1" | "2"; // 1=CPF, 2=CNPJ

export type DpsIdentity = {
  codigoMunicipio: string;
  tipoInscricao: TipoInscricaoFederal;
  inscricaoFederal: string;
  serie: string;
  numero: string;
};

export type DpsJsonInput = {
  serie: string;
  nDPS: string;
  codigoMunicipio: string;
  prestador: {
    cnpj: string;
    im?: string | undefined;
    opSimpNac: "1" | "2" | "3";
    regEspTrib?: string | undefined;
    regApTribSN?: "1" | "2" | "3" | undefined;
  };
  tomador: {
    cpf?: string | undefined;
    cnpj?: string | undefined;
    nome: string;
  };
  servico: {
    cTribNac: string;
    descricao: string;
    codigoMunicipioPrestacao?: string | undefined;
    cTribMun?: string | undefined;
  };
  valores: {
    vServ: number;
    pTotTribSN?: number | undefined;
    pTotTrib?:
      | {
          pTotTribFed: number;
          pTotTribEst: number;
          pTotTribMun: number;
        }
      | undefined;
  };
};

export type EmitirNfseInput = {
  xmlDps?: string | undefined;
  dps?: DpsJsonInput | undefined;
  regime?: RegimeTributario | undefined;
};

export type EmitirNfseResult = {
  status: "autorizada" | "rejeitada";
  xmlNfse?: string;
  chaveAcesso?: string;
  idDps?: string;
  rejection?: SefinRejectionPayload;
};

export type ConsultarNfseResult = {
  found: boolean;
  xmlNfse?: string;
};

export type ConsultarDpsResult =
  | { exists: true; chaveAcesso: string }
  | { exists: true; chaveAcesso: null }
  | { exists: false };

export type RegistrarEventoInput = {
  chaveAcesso: string;
  /** XML do pedido de registro de evento (Anexo II). */
  xmlPedidoEvento: string;
};

export type RegistrarEventoResult = {
  status: "registrado" | "rejeitado";
  body: string;
};

export type SefinRejectionPayload = {
  statusCode: number;
  body: string;
};

export type ParametrosMunicipaisConsulta =
  | { kind: "convenio"; codigoMunicipio: string }
  | { kind: "servico"; codigoMunicipio: string; codigoServico: string }
  | { kind: "contribuinte"; codigoMunicipio: string; cpfCnpj: string };
