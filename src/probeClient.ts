import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ResourceUpdatedNotificationSchema } from "@modelcontextprotocol/sdk/types.js";
import { REVIEW_STATUS_URI } from "./resourceState.js";

export interface SubscribeProbeOptions {
  url: string;
  uri?: string;
  timeoutMs?: number;
  clientName?: string;
  clientVersion?: string;
}

export interface SubscribeProbeResult {
  capabilities: unknown;
  resourceFound: boolean;
  initialText: string;
  notificationUri: string;
  finalText: string;
}

const DEFAULT_TIMEOUT_MS = 15_000;

function getResourceText(result: Awaited<ReturnType<Client["readResource"]>>): string {
  const first = result.contents[0];
  if (!first || !("text" in first)) {
    throw new Error("Expected text resource content");
  }

  return first.text;
}

interface NotificationWaiter {
  promise: Promise<string>;
  cancel: () => void;
}

function waitForUpdatedNotification(client: Client, timeoutMs: number): NotificationWaiter {
  let settled = false;
  let timeout: NodeJS.Timeout;

  const promise = new Promise<string>((resolve, reject) => {
    timeout = setTimeout(() => {
      settled = true;
      reject(new Error(`Timed out waiting for resource update notification after ${timeoutMs} ms`));
    }, timeoutMs);

    client.setNotificationHandler(ResourceUpdatedNotificationSchema, (notification) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      resolve(notification.params.uri);
    });
  });

  return {
    promise,
    cancel: () => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
    },
  };
}

export async function runSubscribeProbe(options: SubscribeProbeOptions): Promise<SubscribeProbeResult> {
  const uri = options.uri ?? REVIEW_STATUS_URI;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const client = new Client({
    name: options.clientName ?? "mcp-resource-subscribe-probe-client",
    version: options.clientVersion ?? "0.1.0",
  });

  try {
    const transport = new StreamableHTTPClientTransport(new URL(options.url));
    await client.connect(transport);

    const capabilities = client.getServerCapabilities()?.resources ?? null;
    const resources = await client.listResources();
    const resourceFound = resources.resources.some((resource) => resource.uri === uri);
    if (!resourceFound) {
      throw new Error(`Resource not found: ${uri}`);
    }

    const initial = await client.readResource({ uri });
    const notification = waitForUpdatedNotification(client, timeoutMs);
    let subscribed = false;
    let notificationUri = "";
    let finalText = "";

    try {
      await client.subscribeResource({ uri });
      subscribed = true;
      notificationUri = await notification.promise;
      const final = await client.readResource({ uri });
      finalText = getResourceText(final);
    } finally {
      notification.cancel();
      if (subscribed) {
        await client.unsubscribeResource({ uri });
      }
    }

    return {
      capabilities,
      resourceFound,
      initialText: getResourceText(initial),
      notificationUri,
      finalText,
    };
  } finally {
    await client.close();
  }
}
