import { z } from 'zod';

export const PROTOCOL_VERSION = 1;
export const CURRENT_API_VERSION = 1;
export const MIN_SUPPORTED_API_VERSION = 1;

export const HandoffCookieSchema = z
  .object({
    name: z.string().min(1).max(4096),
    value: z.string().max(8192),
    domain: z.string().max(255),
    path: z.string().default('/'),
    secure: z.boolean().default(false),
    httpOnly: z.boolean().default(false),
    expires: z.number().optional(),
  })
  .strict();

export type HandoffCookie = z.infer<typeof HandoffCookieSchema>;

export const HandoffSourceSchema = z.enum([
  'download',
  'context_menu',
  'media',
  'grabber',
  'manual',
]);

export type HandoffSource = z.infer<typeof HandoffSourceSchema>;

export const HandoffCapturePayloadSchema = z
  .object({
    url: z.string().url().max(8192),
    finalUrl: z.string().url().max(8192).optional(),
    referrer: z.string().max(8192).optional(),
    userAgent: z.string().max(1024),
    cookies: z.array(HandoffCookieSchema).default([]),
    filename: z.string().min(1).max(255),
    mime: z.string().max(255).optional(),
    size: z.number().nonnegative().optional(),
    source: HandoffSourceSchema.default('download'),
    incognito: z.boolean().default(false),
    pageTitle: z.string().max(512).optional(),
    headers: z.record(z.string(), z.string()).optional(),
  })
  .strict();

export type HandoffCapturePayload = z.infer<typeof HandoffCapturePayloadSchema>;

export const AckPayloadSchema = z
  .object({
    accepted: z.boolean(),
    downloadId: z.string().optional(),
    reason: z.string().optional(),
  })
  .strict();

export type AckPayload = z.infer<typeof AckPayloadSchema>;

export const StatusPayloadSchema = z
  .object({
    speedBps: z.number().nonnegative(),
    active: z.number().int().nonnegative(),
    queued: z.number().int().nonnegative(),
    freeSpace: z.number().nonnegative().optional(),
  })
  .strict();

export type StatusPayload = z.infer<typeof StatusPayloadSchema>;

export const HelloPayloadSchema = z
  .object({
    clientVersion: z.string().max(64),
    apiVersion: z.number().int().positive(),
    browser: z.string().max(64),
  })
  .strict();

export type HelloPayload = z.infer<typeof HelloPayloadSchema>;

export const HelloAckPayloadSchema = z
  .object({
    serverVersion: z.string().max(64),
    apiVersion: z.number().int().positive(),
    authenticated: z.boolean(),
  })
  .strict();

export type HelloAckPayload = z.infer<typeof HelloAckPayloadSchema>;

export const RefreshUrlPayloadSchema = z
  .object({
    downloadId: z.string().optional(),
    url: z.string().url().max(8192),
    cookies: z.array(HandoffCookieSchema).optional(),
  })
  .strict();

export type RefreshUrlPayload = z.infer<typeof RefreshUrlPayloadSchema>;

export const MediaDetectedPayloadSchema = z
  .object({
    url: z.string().url().max(8192),
    mime: z.string().max(255).optional(),
    title: z.string().max(512).optional(),
    size: z.number().nonnegative().optional(),
    tabId: z.number().int().optional(),
  })
  .strict();

export type MediaDetectedPayload = z.infer<typeof MediaDetectedPayloadSchema>;

export const ErrorCodeSchema = z.enum([
  'app_unavailable',
  'unauthorized',
  'bad_request',
  'version_mismatch',
  'internal_error',
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ErrorPayloadSchema = z
  .object({
    code: ErrorCodeSchema,
    message: z.string().max(1024),
  })
  .strict();

export type ErrorPayload = z.infer<typeof ErrorPayloadSchema>;

export const HandoffMessageSchema = z.discriminatedUnion('type', [
  z.object({
    v: z.literal(PROTOCOL_VERSION),
    id: z.string().min(1).max(64),
    type: z.literal('hello'),
    payload: HelloPayloadSchema,
  }).strict(),
  z.object({
    v: z.literal(PROTOCOL_VERSION),
    id: z.string().min(1).max(64),
    type: z.literal('hello_ack'),
    payload: HelloAckPayloadSchema,
  }).strict(),
  z.object({
    v: z.literal(PROTOCOL_VERSION),
    id: z.string().min(1).max(64),
    type: z.literal('capture'),
    payload: HandoffCapturePayloadSchema,
  }).strict(),
  z.object({
    v: z.literal(PROTOCOL_VERSION),
    id: z.string().min(1).max(64),
    type: z.literal('ack'),
    payload: AckPayloadSchema,
  }).strict(),
  z.object({
    v: z.literal(PROTOCOL_VERSION),
    type: z.literal('status'),
    payload: StatusPayloadSchema,
  }).strict(),
  z.object({
    v: z.literal(PROTOCOL_VERSION),
    id: z.string().min(1).max(64).optional(),
    type: z.literal('refresh_url'),
    payload: RefreshUrlPayloadSchema,
  }).strict(),
  z.object({
    v: z.literal(PROTOCOL_VERSION),
    id: z.string().min(1).max(64).optional(),
    type: z.literal('media_detected'),
    payload: MediaDetectedPayloadSchema,
  }).strict(),
  z.object({
    v: z.literal(PROTOCOL_VERSION),
    id: z.string().min(1).max(64).optional(),
    type: z.literal('error'),
    payload: ErrorPayloadSchema,
  }).strict(),
]);

export type HandoffMessage = z.infer<typeof HandoffMessageSchema>;
