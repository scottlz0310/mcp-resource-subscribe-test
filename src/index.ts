import { configFromEnv } from "./config.js";
import { createMcpHttpApp } from "./httpServer.js";
import { createConsoleLogger } from "./logger.js";

const config = configFromEnv();
const log = createConsoleLogger(config);
const app = createMcpHttpApp(config, log);

const httpServer = app.listen(config.port, "0.0.0.0", () => {
  log(`MCP resource subscribe test server listening on http://127.0.0.1:${config.port}/mcp`);
});

const shutdown = () => {
  httpServer.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
