import { describe, expect, it } from "vitest";
import { optionsFromEnv } from "../src/env.js";

describe("optionsFromEnv", () => {
  it("usa defaults razoáveis", () => {
    const options = optionsFromEnv({});
    expect(options.enabled).toBe(true);
    expect(options.mode).toBe("production");
    expect(options.level).toBe("info");
    expect(options.colors).toBe(false);
    expect(options.console).toBe(true);
    expect(options.file).toBeUndefined();
    expect(options.mongo).toBeUndefined();
  });

  it("ativa cores e nível debug no modo debug", () => {
    const options = optionsFromEnv({ LOG_MODE: "debug" });
    expect(options.mode).toBe("debug");
    expect(options.level).toBe("debug");
    expect(options.colors).toBe(true);
  });

  it("respeita LOG_ENABLED=false", () => {
    expect(optionsFromEnv({ LOG_ENABLED: "false" }).enabled).toBe(false);
    expect(optionsFromEnv({ LOG_ENABLED: "true" }).enabled).toBe(true);
  });

  it("monta o destino em arquivo", () => {
    const options = optionsFromEnv({ LOG_FILE_ENABLED: "true", LOG_FILE: "/tmp/x.log" });
    expect(options.file).toEqual({ enabled: true, path: "/tmp/x.log", format: "text" });
  });

  it("monta o destino mongo", () => {
    const options = optionsFromEnv({
      LOG_MONGO_ENABLED: "true",
      MONGO_URL: "mongodb://localhost:27017",
      MONGO_DB: "app",
      MONGO_LOG_COLLECTION: "request_logs",
    });
    expect(options.mongo).toEqual({
      enabled: true,
      uri: "mongodb://localhost:27017",
      database: "app",
      collection: "request_logs",
    });
  });

  it("ignora mongo sem MONGO_URL", () => {
    expect(optionsFromEnv({ LOG_MONGO_ENABLED: "true" }).mongo).toBeUndefined();
  });
});
