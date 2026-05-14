import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ResourceUpdatedNotificationSchema } from "@modelcontextprotocol/sdk/types.js";

// Default URI for the bundled reference server (test://review/status)
const REVIEW_STATUS_URI = "test://review/status";

export interface SubscribeProbeOptions {
  url: string;
  uri?: string;
  timeoutMs?: number;
  clientName?: string;
  clientVersion?: string;
  /** Extra HTTP headers to include in every request (e.g. Authorization).
   * Keys and values must be valid HTTP header names/values; invalid values
   * will cause the underlying transport to throw at request time.
   */
  requestHeaders?: Record<string, string>;
  /**
   * When true, skip the resources/list check and assume the URI exists.
   * Useful for servers that support dynamic resources not returned by
   * resources/list (e.g. copilot-review-mcp watch URIs).
   */
  skipResourceListCheck?: boolean;
}

export interface SubscribeProbeResult {
  capabilities: unknown;
  resourceFound: boolean;
  initialText: string;
  notificationUri: string;
  finalText: string;
  /**
   * How the probe completed:
   * - "subscription"     — received notifications/resources/updated, then re-read
   * - "pre-completion"   — post-subscribe read detected the resource was already
   *                        updated (race: notification fired before subscribe)
   * - "timeout"          — notification never arrived within timeoutMs
   */
  route: "subscription" | "pre-completion" | "timeout";
  subscribed: boolean;
  unsubscribed: boolean;
  errorCode: string | null;
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
  /** Set synchronously when the notification handler fires. Non-null means a
   *  notification was received regardless of which code path awaits the promise. */
  receivedUri: string | null;
}

function waitForUpdatedNotification(client: Client, uri: string, timeoutMs: number): NotificationWaiter {
  let settled = false;
  let timeout: NodeJS.Timeout;

  const waiter: NotificationWaiter = {
    promise: null!,
    cancel: null!,
    receivedUri: null,
  };

  waiter.promise = new Promise<string>((resolve, reject) => {
    timeout = setTimeout(() => {
      settled = true;
      reject(new Error(`Timed out waiting for resource update notification after ${timeoutMs} ms`));
    }, timeoutMs);

    client.setNotificationHandler(ResourceUpdatedNotificationSchema, (notification) => {
      if (settled) {
        return;
      }
      if (notification.params.uri !== uri) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      waiter.receivedUri = notification.params.uri;
      resolve(notification.params.uri);
    });
  });

  // Attach a no-op rejection handler so that if the timeout fires while the
  // caller is in a non-awaiting code path (e.g., the pre-completion branch),
  // Node.js does not report an unhandled promise rejection.
  waiter.promise.catch(() => {});

  waiter.cancel = () => {
    if (settled) {
      return;
    }

    settled = true;
    clearTimeout(timeout);
  };

  return waiter;
}

export async function runSubscribeProbe(options: SubscribeProbeOptions): Promise<SubscribeProbeResult> {
  const uri = options.uri ?? REVIEW_STATUS_URI;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const client = new Client({
    name: options.clientName ?? "mcp-resource-subscribe-probe-client",
    version: options.clientVersion ?? "0.1.1",
  });

  try {
    const transport = new StreamableHTTPClientTransport(new URL(options.url), {
      requestInit: options.requestHeaders ? { headers: options.requestHeaders } : undefined,
    });
    await client.connect(transport);

    const capabilities = client.getServerCapabilities()?.resources ?? null;
    let resourceFound: boolean;
    if (options.skipResourceListCheck) {
      resourceFound = true;
    } else {
      const resources = await client.listResources();
      resourceFound = resources.resources.some((resource) => resource.uri === uri);
      if (!resourceFound) {
        return {
          capabilities,
          resourceFound: false,
          initialText: "",
          notificationUri: "",
          finalText: "",
          route: "timeout",
          subscribed: false,
          unsubscribed: false,
          errorCode: "RESOURCE_NOT_FOUND",
        };
      }
    }

    const initial = await client.readResource({ uri });
    const initialText = getResourceText(initial);
    const notification = waitForUpdatedNotification(client, uri, timeoutMs);
    let subscribed = false;
    let unsubscribed = false;
    let notificationUri = "";
    let finalText = "";
    let errorCode: string | null = null;
    let route: "subscription" | "pre-completion" | "timeout" = "timeout";

    try {
      await client.subscribeResource({ uri });
      subscribed = true;
    } catch {
      notification.cancel();
      return {
        capabilities,
        resourceFound: true,
        initialText,
        notificationUri: "",
        finalText: "",
        route: "timeout",
        subscribed: false,
        unsubscribed: false,
        errorCode: "SUBSCRIPTION_FAILED",
      };
    }

    // Wrap all post-subscribe operations in a single try/finally so that
    // notification.cancel() and unsubscribeResource() always run — even when
    // the post-subscribe read (pre-completion check) or the final read throws.
    try {
      // Immediately read once after subscribe to handle the pre-completion race condition:
      // if the resource was already updated before our subscription was established
      // (i.e., the notification fired before we subscribed), we will never receive
      // that notification. Comparing with initialText detects this window.
      const postSubscribeText = getResourceText(await client.readResource({ uri }));
      if (postSubscribeText !== initialText) {
        if (notification.receivedUri !== null) {
          // Notification arrived during the post-subscribe read window.
          // Prefer subscription route so the output accurately reflects that
          // a notification was received rather than misreporting pre-completion.
          route = "subscription";
          notificationUri = notification.receivedUri;
        } else {
          route = "pre-completion";
        }
        finalText = postSubscribeText;
      } else {
        try {
          notificationUri = await notification.promise;
          route = "subscription";
        } catch {
          errorCode = "NOTIFICATION_TIMEOUT";
        }

        if (route === "subscription") {
          finalText = getResourceText(await client.readResource({ uri }));
        }
      }
    } finally {
      notification.cancel();
      try {
        await client.unsubscribeResource({ uri });
        unsubscribed = true;
      } catch {
        // ignore unsubscribe errors
      }
    }

    return {
      capabilities,
      resourceFound: true,
      initialText,
      notificationUri,
      finalText,
      route,
      subscribed,
      unsubscribed,
      errorCode,
    };
  } finally {
    await client.close();
  }
}
