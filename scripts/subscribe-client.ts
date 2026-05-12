import { REVIEW_STATUS_URI } from "../src/resourceState.js";
import { runSubscribeProbe } from "../src/probeClient.js";

interface CliOptions {
  url: string;
  uri: string;
  timeoutMs: number;
}

function readOption(name: string): string | undefined {
  const prefix = `--${name}=`;
  const index = process.argv.findIndex((arg) => arg === `--${name}` || arg.startsWith(prefix));
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

function parseOptions(): CliOptions {
  const url = readOption("url") ?? process.env.MCP_PROBE_URL ?? "http://127.0.0.1:8089/mcp";
  const uri = readOption("uri") ?? process.env.MCP_PROBE_URI ?? REVIEW_STATUS_URI;
  const timeoutRaw = readOption("timeout-ms") ?? process.env.MCP_PROBE_TIMEOUT_MS ?? "15000";
  const timeoutMs = Number(timeoutRaw);

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`Invalid timeout: ${timeoutRaw}`);
  }

  return { url, uri, timeoutMs };
}

function printResult(result: Awaited<ReturnType<typeof runSubscribeProbe>>): void {
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
