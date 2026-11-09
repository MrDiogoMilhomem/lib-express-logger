# express-logger

Logger para **Express** com:

- níveis `debug`, `info`, `warn`, `error`;
- modo `production` (sem cor, nível `info`) ou `debug` (com cor, nível `debug`);
- saída opcional em **arquivo** e/ou **MongoDB** (independentes entre si);
- liga/desliga por `true`/`false`;
- disponível nas rotas via `req.logger.info(...)`, `req.logger.debug(...)`, etc.;
- mascaramento automático de campos sensíveis (`password`, `token`, ...);
- build **ESM + CJS**, sem dependência obrigatória do driver `mongodb`.

A lib foi extraída do logger de `Servidor-produtosAPI-TS/api` (`src/logger.ts` + `src/middleware/request-logger.ts`) e generalised para uso externo.

---

## Uso básico no Express

```ts
import express from "express";
import { requestLogger } from "express-logger";

const app = express();

app.use(requestLogger({ mode: "debug", colors: true }));

app.get("/produtos", (req, res) => {
  req.logger.info("listando produtos", { query: req.query });
  req.logger.debug("detalhe interno");
  res.json({ ok: true });
});
```

`req.logger` (e o alias em runtime `req.log`) já nasce com os metadados da requisição
(`ip`, `method`, `path`), então não é preciso repetir esses dados a cada chamada.

---

## Opções

| Opção | Tipo | Padrão | Descrição |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Liga/desliga o logger inteiro. Quando `false`, nada é gravado. |
| `mode` | `"production" \| "debug"` | `"production"` | `production` → nível `info` e sem cores. `debug` → nível `debug` e com cores. |
| `level` | `"debug" \| "info" \| "warn" \| "error"` | derivado do `mode` | Sobrescreve o nível mínimo. |
| `colors` | `boolean` | `true` só no modo `debug` | Cores ANSI no console. |
| `console` | `boolean` | `true` | Saída no console (stdout/stderr). |
| `appName` | `string` | — | Nome exibido no início da linha. |
| `timestamps` | `boolean` | `true` | Inclui `AAAA-MM-DD HH:mm:ss.SSS`. |
| `redact` | `string[]` | `[]` | Chaves cujo valor é mascarado (`***`). |
| `defaultMeta` | `object` | `{}` | Metadados fixos em todos os registros. |
| `file` | `{ enabled, path, format? }` | desativado | Saída em arquivo. `format`: `"text"` ou `"json"`. |
| `mongo` | `{ enabled, uri, database, collection, connectTimeoutMS? }` | desativado | Saída no MongoDB. |

Opções extras do middleware:

| Opção | Tipo | Padrão | Descrição |
| --- | --- | --- | --- |
| `logRequests` | `boolean` | `true` | Loga o fim de cada requisição (status + duração). |
| `requestLevel` | nível | `"info"` | Nível usado no log automático da requisição. |
| `ignore` | `(req) => boolean` | — | Ignora requisições (ex.: health check). |
| `requestMeta` | `string[]` | `["ip","method","path"]` | Campos do `req` incluídos no log. |

---

## Exemplos

### Arquivo

```ts
app.use(
  requestLogger({
    file: {
      enabled: true,
      path: "./logs/app.log",
      format: "text", // ou "json" (JSON Lines)
    },
  }),
);
```

O diretório é criado automaticamente e o arquivo é aberto em modo `append`.

### MongoDB

```ts
app.use(
  requestLogger({
    mongo: {
      enabled: true,
      uri: "mongodb://127.0.0.1:27017",
      database: "minha_api",
      collection: "logs",
    },
  }),
);
```

Documento gravado:

```json
{
  "timestamp": "2026-11-09T18:00:00.000Z",
  "level": "info",
  "message": "request",
  "meta": { "ip": "::1", "method": "GET", "path": "/produtos", "status": 200, "ms": 4 },
  "appName": "minha-api"
}
```

### Arquivo **e** MongoDB

```ts
app.use(
  requestLogger({
    mode: "production",
    file: { enabled: true, path: "./logs/app.log" },
    mongo: { enabled: true, uri: process.env.MONGO_URL!, database: "minha_api", collection: "logs" },
  }),
);
```

### Desligar tudo

```ts
app.use(requestLogger({ enabled: false }));
```

O `req.logger` continua existindo (as chamadas viram no-op), então o código das rotas
não quebra.

### Logger fora do Express

```ts
import { createLogger } from "express-logger";

const logger = createLogger({ mode: "debug", appName: "worker" });
logger.info("processo iniciado", { pid: process.pid });

const scoped = logger.child({ jobId: "123" });
scoped.warn("job lento", { ms: 5000 });
```

### Configuração por variáveis de ambiente

```ts
import { optionsFromEnv, requestLogger } from "express-logger";

app.use(requestLogger(optionsFromEnv()));
```

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `LOG_ENABLED` | `true` | Liga/desliga. |
| `LOG_MODE` | `production` | `production` ou `debug`. |
| `LOG_LEVEL` | derivado do modo | `debug`, `info`, `warn`, `error`. |
| `LOG_COLORS` | `true` no modo debug | Cores no console. |
| `LOG_CONSOLE` | `true` | Saída no console. |
| `LOG_TIMESTAMPS` | `true` | Include timestamp. |
| `LOG_APP_NAME` | — | Nome da aplicação. |
| `LOG_REDACT` | — | Lista separada por vírgula. |
| `LOG_FILE_ENABLED` | `false` | Ativa o destino em arquivo. |
| `LOG_FILE` | `./logs/app.log` | Caminho do arquivo. |
| `LOG_FILE_FORMAT` | `text` | `text` ou `json`. |
| `LOG_MONGO_ENABLED` | `false` | Ativa o destino MongoDB. |
| `MONGO_URL` | — | String de conexão. |
| `MONGO_DB` | `logs` | Banco de dados. |
| `MONGO_LOG_COLLECTION` | `logs` | Coleção. |

### Encerramento gracioso

```ts
const logger = createLogger({ file: { enabled: true, path: "./logs/app.log" } });

process.on("SIGTERM", async () => {
  await logger.close?.();
  process.exit(0);
});
```

O middleware também expõe `close()`:

```ts
const loggerMiddleware = requestLogger({ file: { enabled: true, path: "./logs/app.log" } });
app.use(loggerMiddleware);

process.on("SIGTERM", async () => {
  await loggerMiddleware.close();
  process.exit(0);
});
```

---

## Saída no console

```
2026-11-09 18:00:00.123 [minha-api] [INFO ] request {ip="::1" method="GET" path="/produtos" status=200 ms=4}
```

No modo `debug` a mesma linha sai colorida:

- `DEBUG` → ciano
- `INFO` → azul
- `WARN` → amarelo
- `ERROR` → vermelho

---

## Tipos

`req.logger` é tipado automaticamente (augmentation de `Express.Request`), sem
precisar de `declare global` na aplicação.

```ts
import type { Logger, LogLevel, LoggerOptions } from "express-logger";
```

---

## Licença

GNU General Public License v2.0 — veja [LICENSE](./LICENSE).
