import { createWriteStream, mkdirSync, type WriteStream } from "node:fs";
import { dirname } from "node:path";
import type { LogEntry } from "../types.js";
import { formatLine, redactMeta } from "../core/format.js";
import type { LogSink } from "./sink.js";

/** Opções internas do destino em arquivo. */
export interface FileSinkConfig {
  path: string;
  format: "text" | "json";
  timestamps: boolean;
  appName: string | undefined;
  redact: string[];
}

/** Destino de logs em arquivo (append), com diretórios criados automaticamente. */
export class FileSink implements LogSink {
  readonly name = "file";

  private readonly stream: WriteStream;
  private readonly config: FileSinkConfig;
  private closed = false;

  constructor(config: FileSinkConfig) {
    this.config = config;
    mkdirSync(dirname(config.path), { recursive: true });
    this.stream = createWriteStream(config.path, { flags: "a" });
    this.stream.on("error", (error: Error) => {
      process.stderr.write(`[express-logger] falha ao gravar no arquivo: ${error.message}\n`);
    });
  }

  write(entry: LogEntry): void {
    if (this.closed) return;

    const meta = redactMeta(entry.meta, this.config.redact);
    const line =
      this.config.format === "json"
        ? JSON.stringify({
            timestamp: entry.timestamp.toISOString(),
            level: entry.level,
            message: entry.message,
            meta,
          })
        : formatLine({
            level: entry.level,
            message: entry.message,
            meta,
            timestamps: this.config.timestamps,
            appName: this.config.appName,
          });

    this.stream.write(`${line}\n`);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await new Promise<void>((resolve) => {
      this.stream.end(() => resolve());
    });
  }
}
