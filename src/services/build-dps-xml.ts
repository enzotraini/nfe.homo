import { ValidationError } from "../errors/domain-errors.js";
import type { DpsJsonInput } from "../entities/nfse.js";

const NFSE_NS = "http://www.sped.fazenda.gov.br/nfse";
const VER_APLIC = "nfse-homo/0.1.0";

export function buildDpsId(input: {
  codigoMunicipio: string;
  tipoInscricao: "1" | "2";
  inscricaoFederal: string;
  serie: string;
  nDPS: string;
}): string {
  const insc = input.inscricaoFederal.replace(/\D/g, "").padStart(14, "0");
  return `DPS${input.codigoMunicipio}${input.tipoInscricao}${insc}${input.serie.padStart(5, "0")}${input.nDPS.padStart(15, "0")}`;
}

export type TipoAmbienteSefin = "1" | "2";

export function tpAmbFromSefinEnv(
  sefinEnv: "producao-restrita" | "producao",
): TipoAmbienteSefin {
  return sefinEnv === "producao" ? "1" : "2";
}

export function buildDpsXml(
  dps: DpsJsonInput,
  now = new Date(),
  tpAmb: TipoAmbienteSefin = "2",
): string {
  assertDps(dps);

  const cnpj = dps.prestador.cnpj.replace(/\D/g, "");
  const id = buildDpsId({
    codigoMunicipio: dps.codigoMunicipio,
    tipoInscricao: "2",
    inscricaoFederal: cnpj,
    serie: dps.serie,
    nDPS: dps.nDPS,
  });

  const cLocPrestacao = dps.servico.codigoMunicipioPrestacao ?? dps.codigoMunicipio;
  const dhEmi = formatSaoPauloDateTime(now);
  const dCompet = formatSaoPauloDate(now);

  const tomaDoc = dps.tomador.cnpj
    ? `<CNPJ>${escapeXml(dps.tomador.cnpj.replace(/\D/g, ""))}</CNPJ>`
    : `<CPF>${escapeXml((dps.tomador.cpf ?? "").replace(/\D/g, ""))}</CPF>`;

  const im = dps.prestador.im
    ? `<IM>${escapeXml(dps.prestador.im)}</IM>`
    : "";

  const regAp =
    dps.prestador.opSimpNac === "3"
      ? `<regApTribSN>${dps.prestador.regApTribSN ?? "1"}</regApTribSN>`
      : "";

  return `<?xml version="1.0" encoding="UTF-8"?><DPS xmlns="${NFSE_NS}" versao="1.01"><infDPS Id="${escapeXml(id)}"><tpAmb>${tpAmb}</tpAmb><dhEmi>${dhEmi}</dhEmi><verAplic>${VER_APLIC}</verAplic><serie>${escapeXml(dps.serie)}</serie><nDPS>${escapeXml(dps.nDPS)}</nDPS><dCompet>${dCompet}</dCompet><tpEmit>1</tpEmit><cLocEmi>${dps.codigoMunicipio}</cLocEmi><prest><CNPJ>${cnpj}</CNPJ>${im}<regTrib><opSimpNac>${dps.prestador.opSimpNac}</opSimpNac>${regAp}<regEspTrib>${dps.prestador.regEspTrib ?? "0"}</regEspTrib></regTrib></prest><toma>${tomaDoc}<xNome>${escapeXml(dps.tomador.nome)}</xNome></toma><serv><locPrest><cLocPrestacao>${cLocPrestacao}</cLocPrestacao></locPrest><cServ><cTribNac>${escapeXml(dps.servico.cTribNac)}</cTribNac>${dps.servico.cTribMun ? `<cTribMun>${escapeXml(dps.servico.cTribMun)}</cTribMun>` : ""}<xDescServ>${escapeXml(dps.servico.descricao)}</xDescServ></cServ></serv><valores><vServPrest><vServ>${formatDec(dps.valores.vServ)}</vServ></vServPrest><trib><tribMun><tribISSQN>1</tribISSQN><tpRetISSQN>1</tpRetISSQN></tribMun><totTrib>${buildTotTribXml(dps)}</totTrib></trib></valores></infDPS></DPS>`;
}

function assertDps(dps: DpsJsonInput): void {
  if (!/^\d{7}$/.test(dps.codigoMunicipio)) {
    throw new ValidationError("codigoMunicipio deve ter 7 dígitos IBGE");
  }
  if (!/^(?:[0-9]{1,4}|[0-8][0-9]{4})$/.test(dps.serie)) {
    throw new ValidationError("serie inválida (1 a 5 dígitos, máximo 89999)");
  }
  if (!/^[1-9]\d{0,14}$/.test(dps.nDPS)) {
    throw new ValidationError("nDPS deve ter 1 a 15 dígitos, sem zero à esquerda");
  }
  if (!/^\d{14}$/.test(dps.prestador.cnpj.replace(/\D/g, ""))) {
    throw new ValidationError("CNPJ do prestador deve ter 14 dígitos");
  }
  if (dps.prestador.opSimpNac === "3" && !dps.prestador.regApTribSN) {
    throw new ValidationError("regApTribSN é obrigatório para ME/EPP (opSimpNac=3)");
  }
  const temCpf = Boolean(dps.tomador.cpf);
  const temCnpj = Boolean(dps.tomador.cnpj);
  if (temCpf === temCnpj) {
    throw new ValidationError("Tomador deve ter CPF ou CNPJ (só um)");
  }
  if (!/^\d{6}$/.test(dps.servico.cTribNac)) {
    throw new ValidationError("cTribNac deve ter 6 dígitos (ex: 010701)");
  }
  if (!(dps.valores.vServ > 0)) {
    throw new ValidationError("vServ deve ser maior que zero");
  }
  if (dps.prestador.opSimpNac === "3" && dps.valores.pTotTribSN === undefined) {
    throw new ValidationError("pTotTribSN é obrigatório para ME/EPP");
  }
  if (
    dps.prestador.opSimpNac === "1" &&
    !dps.valores.pTotTrib &&
    dps.valores.pTotTribSN === undefined
  ) {
    throw new ValidationError("Não optante exige pTotTrib (Lei da Transparência)");
  }
}

function buildTotTribXml(dps: DpsJsonInput): string {
  if (dps.prestador.opSimpNac === "2") {
    return "<indTotTrib>0</indTotTrib>";
  }
  if (dps.valores.pTotTribSN !== undefined) {
    return `<pTotTribSN>${formatDec(dps.valores.pTotTribSN)}</pTotTribSN>`;
  }
  const p = dps.valores.pTotTrib;
  if (p) {
    return `<pTotTrib><pTotTribFed>${formatDec(p.pTotTribFed)}</pTotTribFed><pTotTribEst>${formatDec(p.pTotTribEst)}</pTotTribEst><pTotTribMun>${formatDec(p.pTotTribMun)}</pTotTribMun></pTotTrib>`;
  }
  throw new ValidationError("totTrib incompleto");
}

function formatDec(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatSaoPauloDateTime(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}-03:00`;
}

function formatSaoPauloDate(date: Date): string {
  return formatSaoPauloDateTime(date).slice(0, 10);
}
