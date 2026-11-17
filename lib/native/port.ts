import { type HandoffMessage, safeParseHandoffMessage, createHelloMessage } from "./protocol";

export const NM_HOST_NAME = "com.mjdm.host";

export type MessageListener = (msg: HandoffMessage) => void;
export type DisconnectListener = () => void;

export class NativePortManager {
  private port: any = null;
  private isConnecting = false;
  private messageListeners: Set<MessageListener> = new Set();
  private disconnectListeners: Set<DisconnectListener> = new Set();
  private pendingRequests = new Map<
    string,
    {
      resolve: (msg: HandoffMessage) => void;
      reject: (err: Error) => void;
      timer: any;
    }
  >();

  public get isConnected(): boolean {
    return this.port !== null;
  }

  public connect(): boolean {
    if (this.port || this.isConnecting) {
      return true;
    }

    try {
      if (typeof browser === "undefined" || !browser.runtime?.connectNative) {
        return false;
      }

      this.isConnecting = true;
      this.port = browser.runtime.connectNative(NM_HOST_NAME);

      this.port.onMessage.addListener((raw: unknown) => {
        const result = safeParseHandoffMessage(raw);
        if (!result.success) {
          return;
        }

        const msg = result.data;
        // Check if this matches a pending request ID
        if ("id" in msg && msg.id && this.pendingRequests.has(msg.id)) {
          const req = this.pendingRequests.get(msg.id);
          this.pendingRequests.delete(msg.id);
          if (req) {
            clearTimeout(req.timer);
            req.resolve(msg);
          }
        }

        // Notify general listeners
        for (const listener of this.messageListeners) {
          try {
            listener(msg);
          } catch {
            // Ignore listener errors
          }
        }
      });

      this.port.onDisconnect.addListener(() => {
        this.cleanup();
        for (const listener of this.disconnectListeners) {
          try {
            listener();
          } catch {
            // Ignore
          }
        }
      });

      // Send initial hello
      const browserName =
        typeof navigator !== "undefined" && navigator.userAgent.includes("Firefox")
          ? "firefox"
          : "chromium";
      this.port.postMessage(createHelloMessage(browserName));
      this.isConnecting = false;
      return true;
    } catch {
      this.cleanup();
      return false;
    }
  }

  public send(msg: HandoffMessage): boolean {
    if (!this.port) {
      const connected = this.connect();
      if (!connected || !this.port) return false;
    }

    try {
      this.port.postMessage(msg);
      return true;
    } catch {
      this.cleanup();
      return false;
    }
  }

  public request(msg: HandoffMessage, timeoutMs = 350): Promise<HandoffMessage> {
    return new Promise((resolve, reject) => {
      if (!("id" in msg) || !msg.id) {
        reject(new Error("Request message must have an id"));
        return;
      }

      const id = msg.id;
      const sent = this.send(msg);
      if (!sent) {
        reject(new Error("Native host not connected (fail-open)"));
        return;
      }

      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("Request timed out (fail-open)"));
        }
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });
    });
  }

  public addMessageListener(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  public addDisconnectListener(listener: DisconnectListener): () => void {
    this.disconnectListeners.add(listener);
    return () => this.disconnectListeners.delete(listener);
  }

  public disconnect(): void {
    if (this.port) {
      try {
        this.port.disconnect();
      } catch {
        // Ignore
      }
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.port = null;
    this.isConnecting = false;
    // Reject all pending
    for (const [, req] of this.pendingRequests) {
      clearTimeout(req.timer);
      req.reject(new Error("Native host disconnected"));
    }
    this.pendingRequests.clear();
  }
}

export const nativePort = new NativePortManager();
