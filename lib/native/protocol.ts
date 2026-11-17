import {
  HandoffMessageSchema,
  HandoffCapturePayloadSchema,
  AckPayloadSchema,
  StatusPayloadSchema,
  HelloPayloadSchema,
  HelloAckPayloadSchema,
  RefreshUrlPayloadSchema,
  ErrorPayloadSchema,
  PROTOCOL_VERSION,
  CURRENT_API_VERSION,
  type HandoffMessage,
  type HandoffCapturePayload,
  type AckPayload,
  type StatusPayload,
  type HelloPayload,
  type HelloAckPayload,
  type RefreshUrlPayload,
  type ErrorPayload,
} from "@mjdm/shared-types";

export {
  HandoffMessageSchema,
  HandoffCapturePayloadSchema,
  AckPayloadSchema,
  StatusPayloadSchema,
  HelloPayloadSchema,
  HelloAckPayloadSchema,
  RefreshUrlPayloadSchema,
  ErrorPayloadSchema,
  PROTOCOL_VERSION,
  CURRENT_API_VERSION,
  type HandoffMessage,
  type HandoffCapturePayload,
  type AckPayload,
  type StatusPayload,
  type HelloPayload,
  type HelloAckPayload,
  type RefreshUrlPayload,
  type ErrorPayload,
};

export function parseHandoffMessage(raw: unknown): HandoffMessage {
  return HandoffMessageSchema.parse(raw);
}

export function safeParseHandoffMessage(raw: unknown) {
  return HandoffMessageSchema.safeParse(raw);
}

export function createHelloMessage(browser: string): HandoffMessage {
  return {
    v: PROTOCOL_VERSION,
    id: Math.random().toString(36).substring(2, 10),
    type: "hello",
    payload: {
      clientVersion: "0.1.0",
      apiVersion: CURRENT_API_VERSION,
      browser,
    },
  };
}

export function createCaptureMessage(
  payload: HandoffCapturePayload,
  id = Math.random().toString(36).substring(2, 10)
): HandoffMessage {
  return {
    v: PROTOCOL_VERSION,
    id,
    type: "capture",
    payload,
  };
}

export function createRefreshUrlMessage(
  payload: RefreshUrlPayload,
  id = Math.random().toString(36).substring(2, 10)
): HandoffMessage {
  return {
    v: PROTOCOL_VERSION,
    id,
    type: "refresh_url",
    payload,
  };
}
