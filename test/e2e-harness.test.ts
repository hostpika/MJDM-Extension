import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";

// The native host is built by the MJDM-APPLICATION repository (cargo build -p mjdm-nmhost).
// Point MJDM_NMHOST_BIN at it, or check the two repositories out side by side. When the
// binary is not available the end-to-end suite is skipped instead of failing.
const NMHOST_BIN =
  process.env.MJDM_NMHOST_BIN ??
  path.resolve(
    __dirname,
    "../../MJDM-APPLICATION/target/debug/mjdm-nmhost" + (process.platform === "win32" ? ".exe" : "")
  );

function writeFrame(child: ChildProcessWithoutNullStreams, msg: object): void {
  const json = JSON.stringify(msg);
  const jsonBuf = Buffer.from(json, "utf8");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(jsonBuf.length, 0); // Native-endian (LE on x86_64)

  child.stdin.write(lenBuf);
  child.stdin.write(jsonBuf);
}

function readFrame(child: ChildProcessWithoutNullStreams, timeoutMs = 4000): Promise<any> {
  return new Promise((resolve, reject) => {
    let accumulated = Buffer.alloc(0);
    let expectedLength: number | null = null;

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for frame after ${timeoutMs}ms`));
    }, timeoutMs);

    const onData = (chunk: Buffer) => {
      accumulated = Buffer.concat([accumulated, chunk]);

      if (expectedLength === null && accumulated.length >= 4) {
        expectedLength = accumulated.readUInt32LE(0);
        accumulated = accumulated.subarray(4);
      }

      if (expectedLength !== null && accumulated.length >= expectedLength) {
        const payloadBuf = accumulated.subarray(0, expectedLength);
        cleanup();
        try {
          const parsed = JSON.parse(payloadBuf.toString("utf8"));
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      }
    };

    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    const cleanup = () => {
      clearTimeout(timer);
      child.stdout.off("data", onData);
      child.off("error", onError);
    };

    child.stdout.on("data", onData);
    child.on("error", onError);
  });
}

describe.skipIf(!fs.existsSync(NMHOST_BIN))("P3-T11 E2E Extension & Native Host Harness Tests", () => {
  let nmhostProcess: ChildProcessWithoutNullStreams;

  beforeEach(() => {
    expect(fs.existsSync(NMHOST_BIN)).toBe(true);
    nmhostProcess = spawn(NMHOST_BIN, ["chrome-extension://test-extension-id/"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        MJDM_NO_AUTO_LAUNCH: "1",
        MJDM_IPC_TIMEOUT_MS: "200", // Quick fail-open in test environment
        MJDM_IPC_PORT: "59999", // Non-listening port to test fail-open immediately
      },
    });

    nmhostProcess.stderr.on("data", (data) => {
      console.log(`[nmhost stderr] ${data.toString().trim()}`);
    });
  });

  afterEach(() => {
    if (nmhostProcess && !nmhostProcess.killed) {
      nmhostProcess.kill();
    }
  });

  it("performs protocol handshake negotiation (hello -> hello_ack)", async () => {
    writeFrame(nmhostProcess, {
      v: 1,
      id: "req-hello-1",
      type: "hello",
      payload: {
        clientVersion: "0.1.0",
        apiVersion: 1,
        browser: "chromium",
      },
    });

    const resp = await readFrame(nmhostProcess);
    expect(resp.type).toBe("hello_ack");
    expect(resp.id).toBe("req-hello-1");
    expect(resp.payload.apiVersion).toBe(1);
    expect(resp.payload.serverVersion).toBe("0.1.0");
  });

  it("handles capture request with schema validation and fail-open reporting", async () => {
    writeFrame(nmhostProcess, {
      v: 1,
      id: "req-cap-1",
      type: "capture",
      payload: {
        url: "https://example.com/dist/archive.zip",
        finalUrl: "https://example.com/dist/archive.zip",
        referrer: "https://example.com/download.html",
        userAgent: "Mozilla/5.0 MJDM-Test",
        cookies: [],
        filename: "archive.zip",
        mime: "application/zip",
        size: 10485760,
        source: "download",
        incognito: false,
      },
    });

    const resp = await readFrame(nmhostProcess, 6000);
    expect(resp.type).toBe("error");
    expect(resp.id).toBe("req-cap-1");
    expect(resp.payload.code).toBe("app_unavailable");
  });

  it("handles refresh_url message correctly with fail-open when app offline", async () => {
    writeFrame(nmhostProcess, {
      v: 1,
      id: "req-ref-1",
      type: "refresh_url",
      payload: {
        downloadId: "dl-expired-99",
        url: "https://example.com/new-signed-token-123.bin",
        cookies: [],
      },
    });

    const resp = await readFrame(nmhostProcess, 6000);
    expect(resp.type).toBe("error");
    expect(resp.payload.code).toBe("app_unavailable");
  });

  it("rejects malformed messages with bad_request error without crashing", async () => {
    writeFrame(nmhostProcess, {
      v: 1,
      id: "req-bad-1",
      type: "capture",
      payload: {
        url: "ftp://not-supported-scheme.com/file.bin",
        userAgent: "test",
        filename: "test.bin",
        source: "download",
        cookies: [],
      },
    });

    const resp = await readFrame(nmhostProcess);
    expect(resp.type).toBe("error");
    expect(resp.payload.code).toBe("bad_request");

    // Verify host is still alive and responsive after error
    writeFrame(nmhostProcess, {
      v: 1,
      id: "req-hello-2",
      type: "hello",
      payload: {
        clientVersion: "0.1.0",
        apiVersion: 1,
        browser: "chromium",
      },
    });

    const ack = await readFrame(nmhostProcess);
    expect(ack.type).toBe("hello_ack");
  });

  it("exits cleanly on EOF without hanging or leaking processes", async () => {
    const exitPromise = new Promise<{ code: number | null }>((resolve) => {
      nmhostProcess.on("exit", (code) => resolve({ code }));
    });

    // Close stdin to trigger EOF
    nmhostProcess.stdin.end();

    const result = await exitPromise;
    expect(result.code).toBe(0);
  });
});
