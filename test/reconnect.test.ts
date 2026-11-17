import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ReconnectManager,
  MAX_RECONNECT_ATTEMPTS,
  BASE_DELAY_MS,
  MAX_DELAY_MS,
} from "../lib/native/reconnect";

describe("ReconnectManager — Service Worker backoff & keep-alive", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calculates exponential delays bounded by MAX_DELAY_MS", () => {
    const manager = new ReconnectManager();

    const d0 = manager.calculateDelay(0);
    expect(d0).toBeGreaterThanOrEqual(1000);
    expect(d0).toBeLessThan(1400);

    const d1 = manager.calculateDelay(1);
    expect(d1).toBeGreaterThanOrEqual(2000);
    expect(d1).toBeLessThan(2400);

    const d2 = manager.calculateDelay(2);
    expect(d2).toBeGreaterThanOrEqual(4000);
    expect(d2).toBeLessThan(4400);

    const dHigh = manager.calculateDelay(10);
    expect(dHigh).toBeGreaterThanOrEqual(MAX_DELAY_MS);
    expect(dHigh).toBeLessThanOrEqual(MAX_DELAY_MS + 300);
  });

  it("stops scheduling after MAX_RECONNECT_ATTEMPTS to keep idle CPU at zero", () => {
    const manager = new ReconnectManager();
    const mockPort = {
      isConnected: false,
      connect: vi.fn().mockReturnValue(false),
    };
    const onGiveUp = vi.fn();

    // Start schedule
    manager.schedule(mockPort as any, undefined, onGiveUp);

    // Fast-forward through all 5 attempts
    for (let i = 0; i < MAX_RECONNECT_ATTEMPTS; i++) {
      vi.runOnlyPendingTimers();
    }

    expect(mockPort.connect).toHaveBeenCalledTimes(MAX_RECONNECT_ATTEMPTS);
    expect(manager.isMaxAttemptsReached).toBe(true);
    expect(onGiveUp).toHaveBeenCalled();

    // Ensure no additional timers exist
    expect(vi.getTimerCount()).toBe(0);

    // Scheduling again returns false without creating timers
    const scheduled = manager.schedule(mockPort as any);
    expect(scheduled).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("resets attempts and cancels pending timers on successful connect", () => {
    const manager = new ReconnectManager();
    let connected = false;
    const mockPort = {
      get isConnected() {
        return connected;
      },
      connect: vi.fn().mockImplementation(() => {
        connected = true;
        return true;
      }),
    };
    const onSuccess = vi.fn();

    manager.schedule(mockPort as any, onSuccess);
    vi.runOnlyPendingTimers();

    expect(mockPort.connect).toHaveBeenCalledTimes(1);
    expect(manager.currentAttempt).toBe(0);
    expect(onSuccess).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("resets and connects immediately on explicit user action", () => {
    const manager = new ReconnectManager();
    const mockPort = {
      isConnected: true,
      connect: vi.fn().mockReturnValue(true),
    };

    manager.schedule(mockPort as any); // Schedule a timer
    const result = manager.resetAndConnect(mockPort as any);

    expect(result).toBe(true);
    expect(manager.currentAttempt).toBe(0);
    expect(vi.getTimerCount()).toBe(0); // Timer was cleared
  });
});
