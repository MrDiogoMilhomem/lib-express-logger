import { afterEach, describe, expect, it } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import { requestLogger } from "../src/middleware.js";

const servers: Array<{ close: (cb: () => void) => void }> = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        }),
    ),
  );
});

async function startApp(configure: (app: express.Express) => void): Promise<string> {
  const app = express();
  configure(app);
  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

describe("requestLogger", () => {
  it("disponibiliza req.logger nas rotas", async () => {
    const base = await startApp((app) => {
      app.use(requestLogger({ enabled: false }));
      app.get("/ping", (req, res) => {
        res.json({ hasLogger: typeof req.logger?.info === "function" });
      });
    });

    const response = await fetch(`${base}/ping`);
    const body = (await response.json()) as { hasLogger: boolean };
    expect(body.hasLogger).toBe(true);
  });

  it("define req.log como alias de req.logger", async () => {
    const base = await startApp((app) => {
      app.use(requestLogger({ enabled: false }));
      app.get("/alias", (req, res) => {
        res.json({ same: (req as express.Request & { log?: unknown }).log === req.logger });
      });
    });

    const body = (await (await fetch(`${base}/alias`)).json()) as { same: boolean };
    expect(body.same).toBe(true);
  });

  it("respeita a opção ignore", async () => {
    const base = await startApp((app) => {
      app.use(requestLogger({ enabled: false, ignore: (req) => req.path === "/health" }));
      app.get("/health", (_req, res) => res.send("ok"));
    });

    const response = await fetch(`${base}/health`);
    expect(response.status).toBe(200);
  });
});
