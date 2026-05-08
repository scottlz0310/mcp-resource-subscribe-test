import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ResourceUpdatedNotificationSchema } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, describe, expect, it } from "vitest";
import type { TestConfig } from "../src/config.js";
import { createMcpHttpApp } from "../src/httpServer.js";
import { REVIEW_STATUS_URI } from "../src/resourceState.js";

const TEST_CONFIG: TestConfig = {
  port: 0,
  mcpPath: "/mcp",
  updateDelaySeconds: 0.05,
  initialStatus: "pending",
  updatedStatus: "reviewed",
  sendListChanged: false,
  logLevel: "silent",
};

const servers: Server[] = [];
const clients: Client[] = [];

async function startServer(logs: string[]) {
  const app = createMcpHttpApp(TEST_CONFIG, (line) => logs.push(line));
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await once(server, "listening");

  const address = server.address() as AddressInfo;
  return new URL(`http://127.0.0.1:${address.port}/mcp`);
}

function getText(result: Awaited<ReturnType<Client["readResource"]>>): string {
  const first = result.contents[0];
  if (!first || !("text" in first)) {
    throw new Error("Expected text resource content");
  }

  return first.text;
}

function waitForUpdatedNotification(client: Client): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timed out waiting for resource update notification"));
    }, 2_000);

    client.setNotificationHandler(ResourceUpdatedNotificationSchema, (notification) => {
      clearTimeout(timeout);
      resolve(notification.params.uri);
    });
  });
}

afterEach(async () => {
  await Promise.allSettled(clients.splice(0).map((client) => client.close()));
  await Promise.allSettled(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        }),
    ),
  );
});

describe("MCP resource subscription probe", () => {
  it("lists, reads, subscribes, notifies, and re-reads the updated resource", async () => {
    const logs: string[] = [];
    const url = await startServer(logs);
    const client = new Client({
      name: "mcp-resource-subscribe-test-client",
      version: "0.1.0",
    });
    clients.push(client);

    const transport = new StreamableHTTPClientTransport(url);
    await client.connect(transport);

    expect(client.getServerCapabilities()?.resources).toEqual({
      subscribe: true,
      listChanged: true,
    });

    const resources = await client.listResources();
    expect(resources.resources).toContainEqual(
      expect.objectContaining({
        uri: REVIEW_STATUS_URI,
        name: "Review Status",
        mimeType: "text/plain",
      }),
    );

    const initial = await client.readResource({ uri: REVIEW_STATUS_URI });
    expect(getText(initial)).toContain("version: 1");
    expect(getText(initial)).toContain("status: pending");

    const notification = waitForUpdatedNotification(client);
    await client.subscribeResource({ uri: REVIEW_STATUS_URI });

    await expect(notification).resolves.toBe(REVIEW_STATUS_URI);

    const updated = await client.readResource({ uri: REVIEW_STATUS_URI });
    expect(getText(updated)).toContain("version: 2");
    expect(getText(updated)).toContain("status: reviewed");

    await client.unsubscribeResource({ uri: REVIEW_STATUS_URI });

    expect(logs).toEqual(
      expect.arrayContaining([
        "[initialize] client connected",
        "[resources/list] requested",
        "[resources/read] uri=test://review/status version=1",
        "[resources/subscribe] uri=test://review/status",
        "[resource/update] uri=test://review/status version=2",
        "[notification/send] notifications/resources/updated uri=test://review/status",
        "[resources/read] uri=test://review/status version=2",
        "[resources/unsubscribe] uri=test://review/status",
      ]),
    );
  });
});
