import type { LogLevel, LogMode } from "../types.js";

/** Peso de cada nível (quanto maior, mais importante). */
export const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** Cor ANSI de cada nível. */
export const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: "\x1b[36m",
  info: "\x1b[34m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
};

export const COLOR_RESET = "\x1b[0m";
export const COLOR_KEY = "\x1b[34m";
export const COLOR_EQUALS = "\x1b[37m";
export const COLOR_VALUE = "\x1b[33m";

/** Nível mínimo derivado do modo de operação. */
export function levelFromMode(mode: LogMode): LogLevel {
  return mode === "debug" ? "debug" : "info";
}

/** Verifica se o nível deve ser emitido dado o nível mínimo. */
export function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[minLevel];
}
