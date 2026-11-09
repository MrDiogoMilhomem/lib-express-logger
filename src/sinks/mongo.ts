import type { LogEntry } from "../types.js";
import { redactMeta } from "../core/format.js";
import type { LogSink } from "./sink.js";

/** Documento gravado no MongoDB. */
export interface MongoLogDocument {
  timestamp: Date;
  level: string;
  message: string;
  meta: Record<string, unknown>;
  appName?: string;
}

/** Subconjunto da API do driver `mongodb` usado pela lib. */
interface MongoCollectionLike {
  insertOne(document: MongoLogDocument): Promise<unknown>;
}

interface MongoDbLike {
  collection(name: string): MongoCollectionLike;
}

interface MongoClientLike {
  connect(): Promise<unknown>;
  db(name: string): MongoDbLike;
  close(): Promise<void>;
}

interface MongoDriver {
  MongoClient: new (uri: string, options?: { serverSelectionTimeoutMS?: number }) => MongoClientLike;
}

/** Opções internas do destino MongoDB. */
export interface MongoSinkConfig {
  uri: string;
  database: string;
  collection: string;
  connectTimeoutMS: number;
  appName: string | undefined;
  redact: string[];
}

/**
 * Destino de logs no MongoDB.
 *
 * O driver `mongodb` é carregado dinamicamente: a lib funciona sem ele
 * instalado e só exige a dependência quando o destino está habilitado.
 */
export class MongoSink implements LogSink {
  readonly name = "mongo";

  private readonly config: MongoSinkConfig;
  private client: MongoClientLike | undefined;
  private collection: MongoCollectionLike | undefined;
  private connecting: Promise<void> | undefined;
  private failed = false;
  private closed = false;

  constructor(config: MongoSinkConfig) {
    this.config = config;
  }

  private async connect(): Promise<void> {
    if (this.collection) return;
    if (this.connecting) return this.connecting;

    this.connecting = (async () => {
      const driver = (await import("mongodb")) as unknown as MongoDriver;
      const client = new driver.MongoClient(this.config.uri, {
        serverSelectionTimeoutMS: this.config.connectTimeoutMS,
      });
      await client.connect();
      this.client = client;
      this.collection = client.db(this.config.database).collection(this.config.collection);
    })();

    try {
      await this.connecting;
    } catch (error) {
      this.connecting = undefined;
      throw error;
    }
  }

  write(entry: LogEntry): void {
    if (this.closed || this.failed) return;

    const meta = redactMeta(entry.meta, this.config.redact);
    const document: MongoLogDocument = {
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      meta,
      ...(this.config.appName ? { appName: this.config.appName } : {}),
    };

    void this.connect()
      .then(() => this.collection?.insertOne(document))
      .catch((error: unknown) => {
        this.failed = true;
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`[express-logger] falha ao gravar no MongoDB: ${message}\n`);
      });
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    const client = this.client;
    this.client = undefined;
    this.collection = undefined;
    if (client) await client.close();
  }
}
