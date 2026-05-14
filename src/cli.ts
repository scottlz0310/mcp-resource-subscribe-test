#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSubscribeProbe } from "./probeClient.js";
import { REVIEW_STATUS_URI } from "./resourceState.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Try compiled path (dist/src/) first, then source path (src/) for tsx direct-run
function readPkg(): { name: string; version: string } {
  for (const rel of ["../../package.json", "../package.json"]) {
    try {
      return JSON.parse(readFileSync(resolve(__dirname, rel), "utf8")) as {
        name: string;
        version: string;
      };
    } catch {
      // try next candidate
    }
  }
  return { name: "mcp-resource-subscriber", version: "0.0.0" };
}
const pkg = readPkg();

function readOption(name: string): string | undefined {
  const prefix = `--${name}=`;
  const index = process.argv.findIndex(
    (arg) => arg === `--${name}` || arg.startsWith(prefix),
  );
  if (index === -1) {
    return undefined;
  }
  const arg = process.argv[index];
  if (arg.startsWith(prefix)) {
    return arg.slice(prefix.length);
  }
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for --${name}`);
  }
  return value;
}

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`${pkg.name} v${pkg.version}`);
  console.log("");
  console.log("Usage:");
  console.log(
    "  mcp-resource-subscriber --url <server-url> [--uri <resource-uri>] [--timeout-ms <ms>]",
  );
  console.log("");
  console.log("Options:");
  console.log("  --url <url>         MCP server Streamable HTTP endpoint");
  console.log("                      Env: MCP_PROBE_URL");
  console.log("  --uri <uri>         Resource URI to subscribe to");
  console.log(
    "                      Default: test://review/status (bundled test server only)",
  );
  console.log("                      Env: MCP_PROBE_URI");
  console.log(
    "  --timeout-ms <ms>   Notification wait timeout in ms (default: 15000)",
  );
  console.log("                      Env: MCP_PROBE_TIMEOUT_MS");
  console.log("  --version, -v       Print version and exit");
  console.log("  --help, -h          Print this help and exit");
  console.log("");
  console.log("Examples:");
  console.log("  # Against the bundled test server (must be running on :8089):");
  console.log("  mcp-resource-subscriber --url http://127.0.0.1:8089/mcp");
  console.log("");
  console.log("  # Against copilot-review-mcp:");
  console.log(
    "  mcp-resource-subscriber --url http://127.0.0.1:8080/mcp/copilot-review \\",
  );
  console.log("    --uri copilot-review://watch/<watch_id> \\");
  console.log("    --timeout-ms 900000");
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  console.log(`${pkg.name} v${pkg.version}`);
  process.exit(0);
}

function parseOptions() {
  const url =
    readOption("url") ?? process.env.MCP_PROBE_URL ?? "http://127.0.0.1:8089/mcp";
  const uri = readOption("uri") ?? process.env.MCP_PROBE_URI ?? REVIEW_STATUS_URI;
  const timeoutRaw =
    readOption("timeout-ms") ?? process.env.MCP_PROBE_TIMEOUT_MS ?? "15000";
  const timeoutMs = Number(timeoutRaw);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`Invalid --timeout-ms: ${timeoutRaw}`);
  }
  return { url, uri, timeoutMs };
}

function printResult(
  result: Awaited<ReturnType<typeof runSubscribeProbe>>,
): void {
  console.log(`capabilities ${JSON.stringify(result.capabilities)}`);
  console.log(`resource-found ${result.resourceFound}`);
  console.log("initial");
  console.log(result.initialText);
  console.log(`notification ${result.notificationUri}`);
  console.log("final");
  console.log(result.finalText);
}

try {
  const options = parseOptions();
  const result = await runSubscribeProbe(options);
  printResult(result);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`subscribe-probe failed: ${message}`);
  process.exitCode = 1;
}
