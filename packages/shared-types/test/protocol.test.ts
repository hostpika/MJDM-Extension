import { describe, it, expect } from 'vitest';
import {
  HandoffMessageSchema,
  HandoffCapturePayloadSchema,
  StatusPayloadSchema,
  AckPayloadSchema,
  PROTOCOL_VERSION,
} from '../src/index';

describe('Shared Protocol Types & Schema Validation', () => {
  it('validates hello message correctly', () => {
    const raw = {
      v: PROTOCOL_VERSION,
      id: 'req-001',
      type: 'hello',
      payload: {
        clientVersion: '0.1.0',
        apiVersion: 1,
        browser: 'chromium',
      },
    };

    const parsed = HandoffMessageSchema.parse(raw);
    expect(parsed.type).toBe('hello');
  });

  it('strictly rejects messages with unknown fields (deny_unknown_fields invariant)', () => {
    const rawWithExtra = {
      v: PROTOCOL_VERSION,
      id: 'req-002',
      type: 'hello',
      payload: {
        clientVersion: '0.1.0',
        apiVersion: 1,
        browser: 'chromium',
      },
      malicious_field: 'attack',
    };

    expect(() => HandoffMessageSchema.parse(rawWithExtra)).toThrow();
  });

  it('strictly validates capture payload and rejects unknown fields', () => {
    const validCapture = {
      url: 'https://example.com/files/archive.zip',
      finalUrl: 'https://cdn.example.com/files/archive.zip',
      referrer: 'https://example.com',
      userAgent: 'Mozilla/5.0 Chrome/130',
      cookies: [
        {
          name: 'session',
          value: 'secret-val',
          domain: 'example.com',
          path: '/',
          secure: true,
          httpOnly: true,
        },
      ],
      filename: 'archive.zip',
      mime: 'application/zip',
      size: 1048576,
      source: 'download',
      incognito: false,
    };

    const parsed = HandoffCapturePayloadSchema.parse(validCapture);
    expect(parsed.filename).toBe('archive.zip');
    expect(parsed.cookies).toHaveLength(1);

    // Should fail with unexpected fields
    expect(() =>
      HandoffCapturePayloadSchema.parse({
        ...validCapture,
        unauthorized_key: 123,
      })
    ).toThrow();
  });

  it('validates ack payload', () => {
    const ack = {
      accepted: true,
      downloadId: '01HFABCDEF',
    };
    const parsed = AckPayloadSchema.parse(ack);
    expect(parsed.accepted).toBe(true);
    expect(parsed.downloadId).toBe('01HFABCDEF');
  });

  it('validates status payload', () => {
    const status = {
      speedBps: 15500000,
      active: 4,
      queued: 1,
      freeSpace: 50000000000,
    };
    const parsed = StatusPayloadSchema.parse(status);
    expect(parsed.speedBps).toBe(15500000);
    expect(parsed.active).toBe(4);
  });
});
