import { describe, expect, it, vi, afterEach } from "vitest";
import { createLogger } from "../src/core/logger.js";
import { formatColoredLine, formatLine, redactMeta, timestamp } from "../src/core/format.js";
import { LEVEL_WEIGHT, levelFromMode, shouldLog } from "../src/core/levels.js";
import type { LogEntry } from "../src/types.js";

function captureStdout(): { output: string[]; restore: () => void } {
  const output: string[] = [];
  const original = process.stdout.write.bind(process.stdout);
  const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    output.push(String(chunk));
    return true;
  });
  return { output, restore: () => spy.mockRestore() };
}

describe("levels", () => {
  it("deriva o nível a partir do modo", () => {
    expect(levelFromMode("debug")).toBe("debug");
    expect(levelFromMode("production")).toBe("info");
  });

  it("compara níveis por peso", () => {
    expect(LEVEL_WEIGHT.error).toBeGreaterThan(LEVEL_WEIGHT.warn);
    expect(shouldLog("debug", "debug")).toBe(true);
    expect(shouldLog("debug", "info")).toBe(false);
    expect(shouldLog("error", "warn")).toBe(true);
  });
});

describe("format", () => {
  it("gera timestamp no formato esperado", () => {
    const value = timestamp(new Date(2024, 0, 2, 3, 4, 5, 6));
    expect(value).toBe("2024-01-02 03:04:05.006");
  });

  it("mascara chaves sensíveis", () => {
    const result = redactMeta({ password: "123", user: "diogo" }, ["password"]);
    expect(result).toEqual({ password: "***", user: "diogo" });
  });

  it("formata linha simples com metadados", () => {
    const line = formatLine({
      level: "info",
      message: "request",
      meta: { status: 200 },
      timestamps: false,
    });
    expect(line).toContain("[INFO ] request");
    expect(line).toContain("status=200");
  });

  it("formata linha colorida", () => {
    const line = formatColoredLine({
      level: "error",
      message: "boom",
      meta: {},
      timestamps: false,
    });
    expect(line).toContain("\x1b[31m");
    expect(line).toContain("boom");
  });
});

describe("createLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("respeita o nível mínimo em modo produção", () => {
    const capture = captureStdout();
    const logger = createLogger({ mode: "production", colors: false, timestamps: false });
    logger.debug("nao deve aparecer");
    logger.info("deve aparecer");
    capture.restore();

    const output = capture.output.join("");
    expect(output).not.toContain("nao deve aparecer");
    expect(output).toContain("deve aparecer");
  });

  it("mostra debug no modo debug", () => {
    const capture = captureStdout();
    const logger = createLogger({ mode: "debug", timestamps: false });
    logger.debug("visivel");
    capture.restore();

    expect(capture.output.join("")).toContain("visivel");
  });

  it("não escreve nada quando desativado", () => {
    const capture = captureStdout();
    const logger = createLogger({ enabled: false });
    logger.error("ignorado");
    capture.restore();

    expect(capture.output.join("")).toBe("");
  });

  it("acumula metadados com child", () => {
    const capture = captureStdout();
    const logger = createLogger({ colors: false, timestamps: false }).child({ rota: "produtos" });
    logger.info("mensagem", { extra: 1 });
    capture.restore();

    const output = capture.output.join("");
    expect(output).toContain("rota=");
    expect(output).toContain("extra=1");
  });

  it("aplica defaultMeta em todos os registros", () => {
    const capture = captureStdout();
    const logger = createLogger({ colors: false, timestamps: false, defaultMeta: { app: "api" } });
    logger.info("mensagem");
    capture.restore();

    expect(capture.output.join("")).toContain("app=");
  });
});

describe("LogEntry", () => {
  it("mantém o contrato do registro", () => {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: "info",
      message: "ok",
      meta: {},
    };
    expect(entry.level).toBe("info");
  });
});
