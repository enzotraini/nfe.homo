# NFS-e HOMO API

API REST intermediária para o **Sistema Nacional NFS-e** (Sefin Nacional).

Recebe JSON, fala com a SEFIN via mTLS e devolve resposta padronizada. Cobre MEI, Simples, Lucro Presumido e Lucro Real (mesmo gateway; muda o conteúdo da DPS).

## Stack

- Node 20+
- TypeScript
- Fastify
- Zod
- Undici (HTTP + mTLS)

Arquitetura: ver [ARCHITECTURE.md](./ARCHITECTURE.md) (HERNES).

## Setup

```bash
cp .env.example .env
pnpm install
pnpm run dev
```

Por padrão `SEFIN_MODE=mock` (sem certificado). Quando tiver o A1:

```env
SEFIN_MODE=http
SEFIN_CERT_PATH=./certs/cliente.p12
SEFIN_CERT_PASSWORD=sua_senha
```

Health: `GET http://localhost:3333/health` — inclui `sefinMode`.

## Testes

```bash
pnpm test
pnpm typecheck
```

No mock, inclua `REJEITAR` no XML para forçar rejeição da SEFIN.

## Endpoints (v1)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/v1/nfse` | Emite NFS-e (`{ "xmlDps": "..." }`) |
| `GET` | `/v1/nfse/:chaveAcesso` | Consulta NFS-e |
| `POST` | `/v1/nfse/:chaveAcesso/eventos` | Registra evento |
| `GET` | `/v1/nfse/:chaveAcesso/eventos` | Lista eventos |
| `GET` | `/v1/nfse/:chaveAcesso/eventos/:tipoEvento` | Eventos por tipo |
| `GET` | `/v1/nfse/:chaveAcesso/eventos/:tipoEvento/:numSeqEvento` | Evento específico |
| `GET` | `/v1/dps/:codigoMunicipio/:tipoInscricao/:inscricaoFederal/:serie/:numero` | Chave da DPS |
| `HEAD` | `/v1/dps/...` | Existe NFS-e para a DPS? |
| `GET` | `/v1/parametros-municipais/:codigoMunicipio/convenio` | Convênio |
| `GET` | `/v1/parametros-municipais/:codigoMunicipio/servico/:codigoServico` | Alíquotas/serviço |
| `GET` | `/v1/parametros-municipais/:codigoMunicipio/contribuinte/:cpfCnpj` | Retenções/benefícios |

## Exemplo — emitir

```bash
curl -s http://localhost:3333/v1/nfse \
  -H 'content-type: application/json' \
  -d '{"xmlDps":"<?xml ... DPS ...>","regime":"simples"}'
```

## Docs oficiais

- Manual colado em `DOC.MD`
- Portal: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica
- Swagger restrito (precisa cert): https://adn.producaorestrita.nfse.gov.br/contribuintes/docs/index.html

## Próximos passos naturais

1. Montar DPS em JSON → XML (Anexo I)
2. Assinatura XML do certificado
3. Persistência de emissões / webhooks
4. Multi-CNPJ (cert por tenant)
# nfe.homo
