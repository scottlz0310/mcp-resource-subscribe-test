import express, { type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { TestConfig } from "./config.js";
import type { LogSink } from "./logger.js";
import { createProbeServer } from "./mcpServer.js";

function jsonRpcError(code: number, message: string) {
  return {
    jsonrpc: "2.0",
    error: { code, message },
    id: null,
  };
}

export function createMcpHttpApp(
  config: TestConfig,
  log: LogSink = () => undefined,
): express.Express {
  const app = express();
  const transports = new Map<string, StreamableHTTPServerTransport>();

  app.use(express.json({ limit: "1mb", type: ["application/json", "application/*+json"] }));

  app.get("/healthz", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  // Serve at /mcp and, if a different gateway path is configured, also at that path.
  const mcpPaths = Array.from(new Set(["/mcp", config.mcpPath]));

  const postMcp = async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.header("mcp-session-id") ?? undefined;

    try {
      let transport: StreamableHTTPServerTransport | undefined;

      if (sessionId) {
        transport = transports.get(sessionId);
        if (!transport) {
          res
            .status(404)
            .json(jsonRpcError(-32000, "Bad Request: invalid session ID"));
          return;
        }
      } else if (isInitializeRequest(req.body)) {
        log("[initialize] client connected");

        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId) => {
            if (transport) {
              transports.set(newSessionId, transport);
            }
          },
          onsessionclosed: (closedSessionId) => {
            transports.delete(closedSessionId);
          },
        });

        transport.onclose = () => {
          const closedSessionId = transport?.sessionId;
          if (closedSessionId) {
            transports.delete(closedSessionId);
          }
        };

        const { server } = createProbeServer(config, log);
        await server.connect(transport);
      } else {
        res
          .status(400)
          .json(jsonRpcError(-32000, "Bad Request: missing session ID"));
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      log(`[server/error] ${message}`);

      if (!res.headersSent) {
        res.status(500).json(jsonRpcError(-32603, "Internal server error"));
      }
    }
  };

  const getMcp = async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.header("mcp-session-id") ?? undefined;
    const transport = sessionId ? transports.get(sessionId) : undefined;

    if (!sessionId || !transport) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    await transport.handleRequest(req, res);
  };

  const deleteMcp = async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.header("mcp-session-id") ?? undefined;
    const transport = sessionId ? transports.get(sessionId) : undefined;

    if (!sessionId || !transport) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    await transport.handleRequest(req, res);
    transports.delete(sessionId);
  };

  app.post(mcpPaths, postMcp);
  app.get(mcpPaths, getMcp);
  app.delete(mcpPaths, deleteMcp);

  return app;
}
