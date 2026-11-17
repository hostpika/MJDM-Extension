import { nativePort } from "../lib/native/port";
import { globalReconnectManager } from "../lib/native/reconnect";
import { handleChromiumDownloadCreated } from "../lib/capture/downloads";
import { handleFirefoxHeadersReceived } from "../lib/capture/webrequest";
import { setAltKeyHeld } from "../lib/capture/altBypass";
import { buildCapturePayload } from "../lib/capture/handoff";
import { createCaptureMessage } from "../lib/native/protocol";
import {
  setupContextMenus,
  handleContextMenuClick,
  injectLinkGrabber,
} from "../lib/menus/contextMenus";
import { setupMediaSniffer, globalMediaRegistry, fileNameForMedia } from "../lib/media/sniffer";

export default defineBackground(() => {
  // Try connecting to native host
  nativePort.connect();

  // Register disconnect listener with bounded exponential backoff
  nativePort.addDisconnectListener(() => {
    globalReconnectManager.schedule(nativePort);
  });

  // Setup context menus
  if (typeof browser !== "undefined") {
    setupContextMenus(browser);

    if (browser.contextMenus?.onClicked) {
      browser.contextMenus.onClicked.addListener(async (info, tab) => {
        await handleContextMenuClick(info, tab, browser);
      });
    }

    // Keyboard shortcuts (commands)
    if (browser.commands?.onCommand) {
      browser.commands.onCommand.addListener(async (command) => {
        if (command === "grab_all_links" && browser.tabs?.query) {
          const tabs = await browser.tabs.query({ active: true, currentWindow: true });
          if (tabs[0]?.id) {
            await injectLinkGrabber(tabs[0].id, browser);
          }
        }
      });
    }
  }

  // Setup media sniffer for streaming and direct media discovery
  if (typeof browser !== "undefined") {
    setupMediaSniffer(browser);
  }

  // Intercept downloads via browser.downloads.onCreated (Chromium MV3 + Firefox fallback)
  if (typeof browser !== "undefined" && browser.downloads?.onCreated) {
    browser.downloads.onCreated.addListener(async (item) => {
      await handleChromiumDownloadCreated(item, browser);
    });
  }

  // Intercept via blocking webRequest in Firefox MV3 / MV2
  if (
    typeof browser !== "undefined" &&
    browser.webRequest?.onHeadersReceived &&
    navigator.userAgent.includes("Firefox")
  ) {
    try {
      (browser.webRequest.onHeadersReceived as any).addListener(
        async (details: any) => {
          return await handleFirefoxHeadersReceived(details, browser);
        },
        { urls: ["<all_urls>"], types: ["main_frame", "sub_frame"] },
        ["blocking", "responseHeaders"]
      );
    } catch {
      // Ignore if blocking webRequest is not available in current context
    }
  }

  // Handle messages from popup / options / content scripts
  if (typeof browser !== "undefined" && browser.runtime?.onMessage) {
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "GET_STATUS") {
        sendResponse({
          connected: nativePort.isConnected,
        });
        return true;
      }
      if (message?.type === "RECONNECT") {
        const ok = globalReconnectManager.resetAndConnect(nativePort);
        sendResponse({ connected: ok });
        return true;
      }
      if (message?.type === "ALT_KEY_STATE") {
        setAltKeyHeld(!!message.held);
        sendResponse({ ok: true });
        return true;
      }
      if (message?.type === "GET_TAB_MEDIA") {
        const tabId = message.tabId || _sender.tab?.id || -1;
        sendResponse({ media: globalMediaRegistry.getStreams(tabId) });
        return true;
      }
      if (message?.type === "DOWNLOAD_MEDIA" && message.url) {
        (async () => {
          try {
            const filename = fileNameForMedia(
              message.pageTitle || "video",
              message.url,
              message.kind,
              message.quality
            );
            const payload = await buildCapturePayload(
              {
                url: message.url,
                filename,
                referrer: message.pageUrl,
                source: "media",
              },
              browser
            );
            const msg = createCaptureMessage(payload);
            // Wait for the desktop app's real answer (it may need a moment to auto-launch).
            const reply = (await nativePort.request(msg, 8000)) as {
              type?: string;
              payload?: { accepted?: boolean; code?: string; message?: string };
            };
            if (reply?.type === "ack" && reply.payload?.accepted !== false) {
              sendResponse({ ok: true });
            } else {
              sendResponse({
                ok: false,
                error: reply?.payload?.message || reply?.payload?.code || "rejected",
              });
            }
          } catch (err) {
            sendResponse({
              ok: false,
              error: err instanceof Error ? err.message : "MJDM desktop app is not reachable",
            });
          }
        })();
        return true;
      }
      if (message?.type === "ADD_URL" && message.url) {
        (async () => {
          try {
            const payload = await buildCapturePayload(
              {
                url: message.url,
                filename: message.filename || "download.bin",
                source: "manual",
              },
              browser
            );
            const msg = createCaptureMessage(payload);
            await nativePort.request(msg, 500).catch(() => nativePort.send(msg));
          } catch {
            // Ignore
          }
        })();
        sendResponse({ ok: true });
        return true;
      }
      if (message?.type === "PAUSE_ALL" || message?.type === "RESUME_ALL") {
        sendResponse({ ok: true });
        return true;
      }
      if (message?.type === "GRABBER_DOWNLOAD_BATCH" && Array.isArray(message.items)) {
        (async () => {
          for (const it of message.items) {
            try {
              const payload = await buildCapturePayload(
                {
                  url: it.url,
                  filename: it.filename,
                  referrer: it.referrer,
                  source: "grabber",
                },
                browser
              );
              const msg = createCaptureMessage(payload);
              await nativePort.request(msg, 500).catch(() => nativePort.send(msg));
            } catch {
              // Continue batch even if one item encounters error
            }
          }
        })();
        sendResponse({ ok: true, queued: message.items.length });
        return true;
      }
      return false;
    });
  }
});
