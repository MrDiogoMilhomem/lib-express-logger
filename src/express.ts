import type { Logger } from "./types.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /**
       * Logger disponível nas rotas após o middleware `requestLogger`.
       *
       * ```ts
       * app.get("/rota", (req, res) => req.logger.info("chegou aqui"));
       * ```
       */
      logger: Logger;
    }
  }
}

export {};
