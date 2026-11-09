import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { NextFunction, Request, Response } from "express";
import { requestLogger } from "../src/middleware.js";

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "express-logger-"));
  dirs.push(dir);
  return dir;
}

describe("requestLogger.close", () => {
  it("encerra o destino em arquivo", async () => {
    const dir = tempDir();
    const path = join(dir, "app.log");
    const middleware = requestLogger({ console: false, file: { enabled: true, path } });

    const req = { ip: "127.0.0.1", method: "GET", path: "/x", get: () => undefined } as unknown as Request;
    const res = { on: () => res } as unknown as Response;
    middleware(req, res, (() => undefined) as NextFunction);
    req.logger.info("chegou", { rota: "/x" });

    await middleware.close();

    expect(readFileSync(path, "utf8")).toContain("/x");
  });
});
