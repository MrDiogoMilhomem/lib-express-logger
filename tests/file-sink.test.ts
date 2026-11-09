import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLogger } from "../src/core/logger.js";

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "express-logger-"));
  dirs.push(dir);
  return dir;
}

describe("FileSink", () => {
  it("grava as linhas no arquivo", async () => {
    const dir = tempDir();
    const path = join(dir, "nested", "app.log");
    const logger = createLogger({ console: false, file: { enabled: true, path } });

    logger.info("mensagem", { status: 200 });
    await logger.close?.();

    const content = readFileSync(path, "utf8");
    expect(content).toContain("mensagem");
    expect(content).toContain("status=200");
  });

  it("suporta formato json", async () => {
    const dir = tempDir();
    const path = join(dir, "app.jsonl");
    const logger = createLogger({ console: false, file: { enabled: true, path, format: "json" } });

    logger.warn("json");
    await logger.close?.();

    const [line] = readFileSync(path, "utf8").trim().split("\n");
    const parsed = JSON.parse(line ?? "{}") as { level: string; message: string };
    expect(parsed.level).toBe("warn");
    expect(parsed.message).toBe("json");
  });

  it("mascara dados sensíveis no arquivo", async () => {
    const dir = tempDir();
    const path = join(dir, "app.log");
    const logger = createLogger({
      console: false,
      redact: ["password"],
      file: { enabled: true, path },
    });

    logger.info("login", { password: "segredo" });
    await logger.close?.();

    const content = readFileSync(path, "utf8");
    expect(content).toContain("***");
    expect(content).not.toContain("segredo");
  });

  it("não cria arquivo quando o destino está desativado", async () => {
    const dir = tempDir();
    const path = join(dir, "app.log");
    const logger = createLogger({ console: false, file: { enabled: false, path } });

    logger.info("mensagem");
    await logger.close?.();

    expect(() => readFileSync(path, "utf8")).toThrow();
  });
});
