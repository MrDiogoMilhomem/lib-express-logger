import { describe, expect, it } from "vitest";
import { MongoSink } from "../src/sinks/mongo.js";
import type { LogEntry } from "../src/types.js";

const entry: LogEntry = {
  timestamp: new Date("2024-01-02T03:04:05.006Z"),
  level: "info",
  message: "mensagem",
  meta: { status: 200 },
};

describe("MongoSink", () => {
  it("não lança quando a conexão falha", async () => {
    const sink = new MongoSink({
      uri: "mongodb://127.0.0.1:1/nao-existe",
      database: "logs",
      collection: "logs",
      connectTimeoutMS: 50,
      appName: "api",
      redact: [],
    });

    expect(() => sink.write(entry)).not.toThrow();
    await sink.close?.();
  });

  it("respeita a flag closed", async () => {
    const sink = new MongoSink({
      uri: "mongodb://127.0.0.1:1/nao-existe",
      database: "logs",
      collection: "logs",
      connectTimeoutMS: 50,
      appName: undefined,
      redact: [],
    });

    await sink.close?.();
    expect(() => sink.write(entry)).not.toThrow();
  });
});
