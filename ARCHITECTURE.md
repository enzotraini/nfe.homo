# Arquitetura HERNES

```
H — Handlers      HTTP (rotas/controllers). Sem regra de negócio.
E — Entities      Tipos e contratos de domínio.
R — Repositories  Portas (interfaces) para o mundo externo.
N — Networks      Adaptadores (cliente SEFIN mTLS).
E — Errors        Erros tipados + mapeamento HTTP.
S — Services      Casos de uso / orquestração.
```

## Fluxo de dependência

```
Handler → Service → Repository (interface)
                         ↑
                   Network (implementa)
```

Dependências apontam para dentro. Services não conhecem Fastify nem detalhes de TLS.

## Pastas

```text
src/
  handlers/       # H
  entities/       # E
  repositories/   # R
  networks/       # N
  errors/         # E
  services/       # S
  common/         # bootstrap (env, app, container)
```

## Erros

| Código | HTTP | Quando |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Zod / validação de serviço |
| `NOT_FOUND` | 404 | NFS-e/DPS inexistente |
| `SEFIN_REJECTION` | 422 | SEFIN rejeitou DPS/evento |
| `SEFIN_UNAVAILABLE` | 502 | Timeout / rede / 5xx SEFIN |
| `CERTIFICATE_ERROR` | 500 | Certificado A1 inválido/ausente |
| `INTERNAL_ERROR` | 500 | Falha não tratada |

Formato de resposta:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "details": {}
  }
}
```

## Networks

| `SEFIN_MODE` | Classe | Quando usar |
|---|---|---|
| `mock` (default) | `SefinMockClient` | Dev/testes sem A1 |
| `http` | `SefinHttpClient` | Homologação/produção com certificado |

Troca só no `.env` + restart. Services/handlers não mudam.

## Como adicionar um endpoint

1. Tipo em `entities/` (se necessário)
2. Método na interface `repositories/nfse-gateway.ts`
3. Implementação em `networks/sefin-http-client.ts` (e no mock, se aplicável)
4. Service em `services/`
5. Schema Zod + rota em `handlers/`
6. Wire no `common/container.ts` e `common/app.ts`
