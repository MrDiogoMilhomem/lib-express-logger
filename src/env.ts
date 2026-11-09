import type { LoggerOptions, LogLevel, LogMode } from "./types.js";

/** Fonte de variáveis de ambiente (injetável para testes). */
export type EnvSource = Record<string, string | undefined>;

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseLevel(value: string | undefined, fallback: LogLevel): LogLevel {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "debug" || normalized === "info" || normalized === "warn" || normalized === "error") {
    return normalized;
  }
  return fallback;
}

function parseMode(value: string | undefined, fallback: LogMode): LogMode {
  if (value === undefined) return fallback;
  return value.trim().toLowerCase() === "debug" ? "debug" : "production";
}

/**
 * Monta as opções do logger a partir de variáveis de ambiente.
 *
 * | Variável | Padrão | Descrição |
 * | --- | --- | --- |
 * | `LOG_ENABLED` | `true` | Liga/desliga o logger. |
 * | `LOG_MODE` | `production` | `production` ou `debug`. |
 * | `LOG_LEVEL` | derivado do modo | `debug`, `info`, `warn`, `error`. |
 * | `LOG_COLORS` | `true` no modo debug | Cores no console. |
 * | `LOG_CONSOLE` | `true` | Saída no console. |
 * | `LOG_APP_NAME` | — | Nome exibido no log. |
 * | `LOG_FILE_ENABLED` | `false` | Ativa o destino em arquivo. |
 * | `LOG_FILE` | `./logs/app.log` | Caminho do arquivo. |
 * | `LOG_FILE_FORMAT` | `text` | `text` ou `json`. |
 * | `LOG_MONGO_ENABLED` | `false` | Ativa o destino MongoDB. |
 * | `MONGO_URL` | — | String de conexão do MongoDB. |
 * | `MONGO_DB` | `logs` | Banco de dados. |
 * | `MONGO_LOG_COLLECTION` | `logs` | Coleção de logs. |
 */
export function optionsFromEnv(env: EnvSource = process.env): LoggerOptions {
  const mode = parseMode(env.LOG_MODE, "production");
  const level = parseLevel(env.LOG_LEVEL, mode === "debug" ? "debug" : "info");

  const options: LoggerOptions = {
    enabled: parseBoolean(env.LOG_ENABLED, true),
    mode,
    level,
    colors: parseBoolean(env.LOG_COLORS, mode === "debug"),
    console: parseBoolean(env.LOG_CONSOLE, true),
    timestamps: parseBoolean(env.LOG_TIMESTAMPS, true),
  };

  if (env.LOG_APP_NAME) options.appName = env.LOG_APP_NAME;
  if (env.LOG_REDACT) options.redact = env.LOG_REDACT.split(",").map((item) => item.trim()).filter(Boolean);

  const fileEnabled = parseBoolean(env.LOG_FILE_ENABLED, false);
  if (fileEnabled) {
    options.file = {
      enabled: true,
      path: env.LOG_FILE ?? "./logs/app.log",
      format: env.LOG_FILE_FORMAT === "json" ? "json" : "text",
    };
  }

  const mongoEnabled = parseBoolean(env.LOG_MONGO_ENABLED, false);
  if (mongoEnabled && env.MONGO_URL) {
    options.mongo = {
      enabled: true,
      uri: env.MONGO_URL,
      database: env.MONGO_DB ?? "logs",
      collection: env.MONGO_LOG_COLLECTION ?? "logs",
    };
  }

  return options;
}
