interface HistogramBucket {
  le: number;
  count: number;
}

export class MetricsService {
  private requestCount = 0;
  private readonly rejectionCounts = new Map<string, number>();
  private readonly latencies: number[] = [];
  private readonly maxLatencySamples = 10000;

  incrementRequestCount(): void {
    this.requestCount += 1;
  }

  recordRejection(reasonCode: string): void {
    const current = this.rejectionCounts.get(reasonCode) ?? 0;
    this.rejectionCounts.set(reasonCode, current + 1);
  }

  recordLatencyMs(durationMs: number): void {
    this.latencies.push(durationMs);
    if (this.latencies.length > this.maxLatencySamples) {
      this.latencies.shift();
    }
  }

  getSnapshot(): Record<string, unknown> {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95) - 1;
    const p95 =
      sorted.length > 0 ? sorted[Math.max(0, p95Index)] : 0;

    const rejectionReasons: Record<string, number> = {};
    for (const [key, value] of this.rejectionCounts) {
      rejectionReasons[key] = value;
    }

    return {
      request_count: this.requestCount,
      rejection_reason_count: rejectionReasons,
      latency_ms: {
        p95,
        sample_size: sorted.length,
        histogram: this.buildHistogram(sorted),
      },
    };
  }

  private buildHistogram(samples: number[]): HistogramBucket[] {
    const boundaries = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
    return boundaries.map((le) => ({
      le,
      count: samples.filter((s) => s <= le).length,
    }));
  }
}
