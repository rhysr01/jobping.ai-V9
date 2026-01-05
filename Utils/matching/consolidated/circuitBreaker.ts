/**
 * Circuit breaker pattern implementation for AI matching
 */

import { CIRCUIT_BREAKER_THRESHOLD, CIRCUIT_BREAKER_TIMEOUT } from "./config";

export class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private isOpen = false;
  private readonly threshold: number;
  private readonly timeout: number;

  constructor(
    threshold: number = CIRCUIT_BREAKER_THRESHOLD,
    timeout: number = CIRCUIT_BREAKER_TIMEOUT,
  ) {
    this.threshold = threshold;
    this.timeout = timeout;
  }

  canExecute(): boolean {
    if (!this.isOpen) return true;

    const now = Date.now();
    if (now - this.lastFailure > this.timeout) {
      this.isOpen = false;
      this.failures = 0;
      return true;
    }

    return false;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.isOpen = false;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= this.threshold) {
      this.isOpen = true;
    }
  }

  getStatus() {
    return {
      isOpen: this.isOpen,
      failures: this.failures,
      lastFailure: this.lastFailure,
    };
  }
}
