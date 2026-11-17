import type { NativePortManager } from "./port";

export const MAX_RECONNECT_ATTEMPTS = 5;
export const BASE_DELAY_MS = 1000;
export const MAX_DELAY_MS = 30000;

export class ReconnectManager {
  private attempt = 0;
  private timer: any = null;
  private isScheduled = false;

  public get currentAttempt(): number {
    return this.attempt;
  }

  public get isMaxAttemptsReached(): boolean {
    return this.attempt >= MAX_RECONNECT_ATTEMPTS;
  }

  /**
   * Calculates exponential backoff delay with jitter.
   * e.g., 1s, 2s, 4s, 8s, 16s, up to 30s.
   */
  public calculateDelay(attempt = this.attempt): number {
    const exponential = BASE_DELAY_MS * Math.pow(2, attempt);
    const capped = Math.min(MAX_DELAY_MS, exponential);
    const jitter = Math.floor(Math.random() * 300); // 0-300ms jitter
    return capped + jitter;
  }

  /**
   * Schedules next reconnect attempt with backoff.
   * After MAX_RECONNECT_ATTEMPTS, goes idle without timers (zero idle CPU).
   */
  public schedule(port: NativePortManager, onSuccess?: () => void, onGiveUp?: () => void): boolean {
    if (port.isConnected || this.isScheduled) {
      return false;
    }

    if (this.attempt >= MAX_RECONNECT_ATTEMPTS) {
      if (onGiveUp) onGiveUp();
      return false; // Zero timers when idle after giving up
    }

    this.isScheduled = true;
    const delay = this.calculateDelay(this.attempt);

    this.timer = setTimeout(() => {
      this.isScheduled = false;
      this.attempt += 1;

      const ok = port.connect();
      if (ok && port.isConnected) {
        this.reset();
        if (onSuccess) onSuccess();
      } else if (this.attempt < MAX_RECONNECT_ATTEMPTS) {
        this.schedule(port, onSuccess, onGiveUp);
      } else {
        if (onGiveUp) onGiveUp();
      }
    }, delay);

    return true;
  }

  /**
   * Explicit user action resets counter and attempts immediate reconnect.
   */
  public resetAndConnect(port: NativePortManager): boolean {
    this.reset();
    return port.connect();
  }

  public reset(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.isScheduled = false;
    this.attempt = 0;
  }
}

export const globalReconnectManager = new ReconnectManager();
