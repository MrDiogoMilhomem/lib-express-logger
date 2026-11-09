/**
 * Tipos públicos da lib `express-logger`.
 */

/** Níveis de log suportados. */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Modo de operação:
 * - `production`: nível mínimo `info` e sem cores no console.
 * - `debug`: nível mínimo `debug` e cores no console.
 */
export type LogMode = "production" | "debug";

/** Metadados estruturados que acompanham a mensagem. */
export type Meta = Record<string, unknown>;

/** Destino de saída em arquivo. */
export interface FileSinkOptions {
  /** Ativa/desativa o destino em arquivo. */
  enabled: boolean;
  /** Caminho do arquivo de log (diretórios são criados automaticamente). */
  path: string;
  /** Formato de cada linha: `text` (padrão) ou `json` (JSON Lines). */
  format?: "text" | "json" | undefined;
}

/** Destino de saída em MongoDB. */
export interface MongoSinkOptions {
  /** Ativa/desativa o destino no MongoDB. */
  enabled: boolean;
  /** String de conexão (`mongodb://...`). */
  uri: string;
  /** Nome do banco de dados. */
  database: string;
  /** Nome da coleção onde os logs são gravados. */
  collection: string;
  /** Timeout de seleção do servidor (ms). Padrão: `5000`. */
  connectTimeoutMS?: number | undefined;
}

/** Opções de configuração do logger. */
export interface LoggerOptions {
  /** Liga/desliga o logger por completo. Padrão: `true`. */
  enabled?: boolean | undefined;
  /** Modo `production` ou `debug`. Padrão: `production`. */
  mode?: LogMode | undefined;
  /** Nível mínimo explícito. Sobrescreve o derivado do `mode`. */
  level?: LogLevel | undefined;
  /** Liga/desliga cores no console. Padrão: `true` apenas no modo `debug`. */
  colors?: boolean | undefined;
  /** Liga/desliga a saída no console. Padrão: `true`. */
  console?: boolean | undefined;
  /** Nome da aplicação exibido no log. Ex.: `"produtos-api"`. */
  appName?: string | undefined;
  /** Inclui timestamp nas linhas. Padrão: `true`. */
  timestamps?: boolean | undefined;
  /** Chaves cujo valor é mascarado (`***`) antes de gravar. */
  redact?: string[] | undefined;
  /** Metadados fixos incluídos em todos os registros. */
  defaultMeta?: Meta | undefined;
  /** Destino em arquivo. Omitir ou `enabled: false` desliga. */
  file?: FileSinkOptions | undefined;
  /** Destino em MongoDB. Omitir ou `enabled: false` desliga. */
  mongo?: MongoSinkOptions | undefined;
}

/** Interface do logger exposto em `req.logger`. */
export interface Logger {
  debug(message: string, meta?: Meta): void;
  info(message: string, meta?: Meta): void;
  warn(message: string, meta?: Meta): void;
  error(message: string, meta?: Meta): void;
  /** Cria um logger filho com metadados fixos adicionais. */
  child(meta: Meta): Logger;
  /** Encerra os destinos (arquivo/Mongo). Opcional. */
  close?(): Promise<void>;
}

/** Registro interno gerado pelo logger. */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  meta: Meta;
}
