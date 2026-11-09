import type { LogEntry, LogLevel, Logger, LoggerOptions, Meta } from "../types.js";
import { formatColoredLine, formatLine, redactMeta } from "./format.js";
import { levelFromMode, shouldLog } from "./levels.js";
import { FileSink } from "../sinks/file.js";
import { MongoSink } from "../sinks/mongo.js";
import type { LogSink } from "../sinks/sink.js";

/** Configuração interna já resolvida (sem `undefined` opcionais). */
interface ResolvedOptions {
  enabled: boolean;
  level: LogLevel;
  colors: boolean;
  console: boolean;
  timestamps: boolean;
  appName: string | undefined;
  redact: string[];
  defaultMeta: Meta;
}

/** Sink de console: escreve a linha colorida no stdout/stderr. */
class ConsoleSink implements LogSink {
  readonly name = "console";

  constructor(
    private readonly colors: boolean,
    private readonly timestamps: boolean,
    private readonly appName: string | undefined,
  ) {}

  write(entry: LogEntry): void {
    const line = this.colors
      ? formatColoredLine({
          level: entry.level,
          message: entry.message,
          meta: entry.meta,
          timestamps: this.timestamps,
          appName: this.appName,
        })
      : formatLine({
          level: entry.level,
          message: entry.message,
          meta: entry.meta,
          timestamps: this.timestamps,
          appName: this.appName,
        });

    const stream = entry.level === "error" || entry.level === "warn" ? process.stderr : process.stdout;
    stream.write(`${line}\n`);
  }
}

function resolveOptions(options: LoggerOptions): ResolvedOptions {
  const mode = options.mode ?? "production";
  const colors = options.colors ?? mode === "debug";
  return {
    enabled: options.enabled ?? true,
    level: options.level ?? levelFromMode(mode),
    colors,
    console: options.console ?? true,
    timestamps: options.timestamps ?? true,
    appName: options.appName,
    redact: options.redact ?? [],
    defaultMeta: options.defaultMeta ?? {},
  };
}

function buildSinks(options: LoggerOptions, resolved: ResolvedOptions): LogSink[] {
  const sinks: LogSink[] = [];

  if (resolved.console) {
    sinks.push(new ConsoleSink(resolved.colors, resolved.timestamps, resolved.appName));
  }

  if (options.file?.enabled) {
    sinks.push(
      new FileSink({
        path: options.file.path,
        format: options.file.format ?? "text",
        timestamps: resolved.timestamps,
        appName: resolved.appName,
        redact: resolved.redact,
      }),
    );
  }

  if (options.mongo?.enabled) {
    sinks.push(
      new MongoSink({
        uri: options.mongo.uri,
        database: options.mongo.database,
        collection: options.mongo.collection,
        connectTimeoutMS: options.mongo.connectTimeoutMS ?? 5000,
        appName: resolved.appName,
        redact: resolved.redact,
      }),
    );
  }

  return sinks;
}

/**
 * Cria um logger com os sinks configurados.
 *
 * Quando `enabled: false`, o logger é criado sem sinks e nada é gravado.
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const resolved = resolveOptions(options);
  const sinks = resolved.enabled ? buildSinks(options, resolved) : [];

  const create = (baseMeta: Meta): Logger => {
    const write = (level: LogLevel, message: string, meta: Meta = {}): void => {
      if (!resolved.enabled || sinks.length === 0) return;
      if (!shouldLog(level, resolved.level)) return;

      const merged = redactMeta({ ...resolved.defaultMeta, ...baseMeta, ...meta }, resolved.redact);
      const entry: LogEntry = { timestamp: new Date(), level, message, meta: merged };
      for (const sink of sinks) sink.write(entry);
    };

    const logger: Logger = {
      debug: (message, meta) => write("debug", message, meta),
      info: (message, meta) => write("info", message, meta),
      warn: (message, meta) => write("warn", message, meta),
      error: (message, meta) => write("error", message, meta),
      child: (extra) => create({ ...baseMeta, ...extra }),
      close: async () => {
        for (const sink of sinks) await sink.close?.();
      },
    };

    return logger;
  };

  return create({});
}

/** Converte qualquer valor de erro em string. */
export function errorToString(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
