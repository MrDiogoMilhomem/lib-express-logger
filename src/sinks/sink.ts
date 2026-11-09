import type { LogEntry } from "../types.js";

/**
 * Contrato de um destino de saída de logs.
 *
 * Implementações devem nunca lançar erros para o chamador: falhas de
 * I/O são tratadas internamente (ver `src/sinks/file.ts` e `src/sinks/mongo.ts`).
 */
export interface LogSink {
  /** Nome do destino (usado em mensagens de diagnóstico). */
  readonly name: string;
  /** Grava uma entrada de log. */
  write(entry: LogEntry): void;
  /** Encerra o destino (fecha arquivos/conexões). */
  close?(): Promise<void>;
}
