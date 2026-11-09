import type { LogLevel, Meta } from "../types.js";
import { COLOR_EQUALS, COLOR_KEY, COLOR_RESET, COLOR_VALUE, LEVEL_COLOR } from "./levels.js";

/** Timestamp no formato `AAAA-MM-DD HH:mm:ss.SSS`. */
export function timestamp(date: Date = new Date()): string {
  const pad = (value: number, size = 2): string => String(value).padStart(size, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return `${day} ${time}.${pad(date.getMilliseconds(), 3)}`;
}

/** JSON.stringify seguro para valores circulares ou não serializáveis. */
export function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return (
      JSON.stringify(value, (_key, val: unknown) => {
        if (typeof val === "bigint") return val.toString();
        if (typeof val === "object" && val !== null) {
          if (seen.has(val)) return "[Circular]";
          seen.add(val);
        }
        if (typeof val === "function") return "[Function]";
        if (typeof val === "symbol") return val.toString();
        return val;
      }) ?? String(value)
    );
  } catch {
    return String(value);
  }
}

/** Mascara os valores das chaves sensíveis. */
export function redactMeta(meta: Meta, keys: string[]): Meta {
  if (keys.length === 0) return meta;
  const lower = keys.map((key) => key.toLowerCase());
  const result: Meta = {};
  for (const [key, value] of Object.entries(meta)) {
    result[key] = lower.includes(key.toLowerCase()) ? "***" : value;
  }
  return result;
}

/** Metadados formatados com cores. */
export function formatMeta(meta: Meta): string {
  const pairs = Object.entries(meta)
    .filter(([, value]) => value !== undefined)
    .map(
      ([key, value]) =>
        `${COLOR_KEY}${key}${COLOR_RESET}${COLOR_EQUALS}=${COLOR_RESET}${COLOR_VALUE}${safeStringify(value)}${COLOR_RESET}`,
    );
  return pairs.length > 0 ? ` {${pairs.join(" ")}}` : "";
}

/** Metadados formatados sem cores. */
export function formatMetaPlain(meta: Meta): string {
  const pairs = Object.entries(meta)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${safeStringify(value)}`);
  return pairs.length > 0 ? ` {${pairs.join(" ")}}` : "";
}

/** Linha completa em texto puro (usada no arquivo). */
export function formatLine(options: {
  level: LogLevel;
  message: string;
  meta: Meta;
  timestamps: boolean;
  appName?: string | undefined;
}): string {
  const label = options.level.toUpperCase().padEnd(5);
  const parts: string[] = [];
  if (options.timestamps) parts.push(timestamp());
  if (options.appName) parts.push(`[${options.appName}]`);
  parts.push(`[${label}]`);
  return `${parts.join(" ")} ${options.message}${formatMetaPlain(options.meta)}`;
}

/** Linha completa colorida (usada no console). */
export function formatColoredLine(options: {
  level: LogLevel;
  message: string;
  meta: Meta;
  timestamps: boolean;
  appName?: string | undefined;
}): string {
  const label = options.level.toUpperCase().padEnd(5);
  const parts: string[] = [];
  if (options.timestamps) parts.push(timestamp());
  if (options.appName) parts.push(`[${options.appName}]`);
  parts.push(`${LEVEL_COLOR[options.level]}[${label}]${COLOR_RESET}`);
  return `${parts.join(" ")} ${options.message}${formatMeta(options.meta)}`;
}
