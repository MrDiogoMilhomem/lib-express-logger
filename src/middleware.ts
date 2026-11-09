import type { NextFunction, Request, RequestHandler, Response } from "express";
import { createLogger } from "./core/logger.js";
import type { Logger, LoggerOptions, Meta } from "./types.js";

/** Opções do middleware de request logging. */
export interface RequestLoggerOptions extends LoggerOptions {
  /**
   * Loga automaticamente o fim de cada requisição.
   * Padrão: `true`.
   */
  logRequests?: boolean | undefined;
  /**
   * Nível usado no log automático de requisição. Padrão: `info`.
   */
  requestLevel?: "debug" | "info" | "warn" | "error" | undefined;
  /**
   * Ignora requisições que casem com o predicado (ex.: health check).
   */
  ignore?: ((req: Request) => boolean) | undefined;
  /**
   * Campos do `req` incluídos como metadados do log da requisição.
   * Padrão: `["ip", "method", "path"]`.
   */
  requestMeta?: string[] | undefined;
}

/** Monta os metadados padrão da requisição. */
function buildRequestMeta(req: Request, fields: string[]): Meta {
  const meta: Meta = {};
  for (const field of fields) {
    switch (field) {
      case "ip":
        meta.ip = req.ip;
        break;
      case "method":
        meta.method = req.method;
        break;
      case "path":
        meta.path = req.path;
        break;
      case "url":
        meta.url = req.originalUrl;
        break;
      case "host":
        meta.host = req.hostname;
        break;
      case "userAgent":
        meta.userAgent = req.get("user-agent");
        break;
      default:
        meta[field] = (req as unknown as Record<string, unknown>)[field];
        break;
    }
  }
  return meta;
}

/**
 * Middleware Express que cria `req.logger` e (opcionalmente) registra
 * o resultado de cada requisição.
 *
 * ```ts
 * app.use(requestLogger({ mode: "debug", colors: true }));
 * app.get("/ping", (req, res) => {
 *   req.logger.info("pong");
 *   res.json({ ok: true });
 * });
 * ```
 */
/** Middleware de request logging com encerramento gracioso. */
export type RequestLoggerMiddleware = RequestHandler & {
  /** Encerra os destinos (arquivo/Mongo) do logger do middleware. */
  close(): Promise<void>;
};

/**
 * Middleware Express que cria `req.logger` e (opcionalmente) registra
 * o resultado de cada requisição.
 *
 * ```ts
 * app.use(requestLogger({ mode: "debug", colors: true }));
 * app.get("/ping", (req, res) => {
 *   req.logger.info("pong");
 *   res.json({ ok: true });
 * });
 * ```
 */
export function requestLogger(options: RequestLoggerOptions = {}): RequestLoggerMiddleware {
  const logger = createLogger(options);
  const logRequests = options.logRequests ?? true;
  const requestLevel = options.requestLevel ?? "info";
  const requestMeta = options.requestMeta ?? ["ip", "method", "path"];
  const ignore = options.ignore;

  const middleware = (req: Request, res: Response, next: NextFunction): void => {
    const meta = buildRequestMeta(req, requestMeta);
    const scoped = logger.child(meta);
    req.logger = scoped;
    // Alias em tempo de execução, compatível com projetos que usam `req.log`.
    // Não é declarado globalmente para não conflitar com augmentations do app.
    (req as Request & { log?: Logger }).log = scoped;

    if (logRequests && !ignore?.(req)) {
      const start = Date.now();
      res.on("finish", () => {
        scoped[requestLevel]("request", {
          status: res.statusCode,
          ms: Date.now() - start,
        });
      });
    }

    next();
  };

  middleware.close = async () => {
    await logger.close?.();
  };

  return middleware;
}

/**
 * Cria um logger já vinculado a uma requisição, sem instalar o middleware.
 * Útil quando a lib é usada apenas em handlers avulsos.
 */
export function createRequestLogger(req: Request, options: LoggerOptions = {}): Logger {
  return createLogger(options).child(buildRequestMeta(req, ["ip", "method", "path"]));
}
