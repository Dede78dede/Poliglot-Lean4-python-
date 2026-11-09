/**
 * Load Testing Framework (Phase 15 Pre-Flight 14.9.9, Window 2)
 *
 * Simulates high-throughput synthetic load (1000 requests per endpoint)
 * across concurrency tiers (10, 50, 100 workers).
 */

import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

export interface LoadTestMetrics {
  readonly endpoint: string;
  readonly totalRequests: number;
  readonly concurrency: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly errorRatePercent: number;
  readonly durationMs: number;
  readonly throughputReqPerSec: number;
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly p99Ms: number;
}

export async function runLoadTest(options: {
  endpoint: string;
  totalRequests?: number;
  concurrency?: number;
  workerFn: () => Promise<boolean>;
}): Promise<LoadTestMetrics> {
  const total = options.totalRequests ?? 1000;
  const concurrency = options.concurrency ?? 50;
  const times: number[] = [];
  let successful = 0;
  let failed = 0;

  const tStart = performance.now();
  let completed = 0;

  async function worker(): Promise<void> {
    while (completed < total) {
      completed++;
      const t0 = performance.now();
      try {
        const ok = await options.workerFn();
        if (ok) successful++;
        else failed++;
      } catch {
        failed++;
      } finally {
        times.push(performance.now() - t0);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const durationMs = performance.now() - tStart;
  times.sort((a, b) => a - b);
  const n = times.length;

  return {
    endpoint: options.endpoint,
    totalRequests: total,
    concurrency,
    successfulRequests: successful,
    failedRequests: failed,
    errorRatePercent: Number(((failed / (total || 1)) * 100).toFixed(2)),
    durationMs: Number(durationMs.toFixed(2)),
    throughputReqPerSec: Number(((total / (durationMs / 1000)) || 0).toFixed(2)),
    p50Ms: Number((times[Math.floor(n * 0.50)] ?? 0).toFixed(3)),
    p95Ms: Number((times[Math.floor(n * 0.95)] ?? 0).toFixed(3)),
    p99Ms: Number((times[Math.floor(n * 0.99)] ?? 0).toFixed(3)),
  };
}

if (process.argv[1]?.includes('load-test')) {
  console.log('Running standalone load test benchmark...');
  runLoadTest({
    endpoint: '/api/v1/verify',
    totalRequests: 1000,
    concurrency: 50,
    workerFn: async () => {
      // Simulate adjudication hash & check
      const hash = `hash-${Math.random()}`;
      return hash.length > 5;
    },
  }).then((metrics) => {
    const reportPath = path.resolve('reports/load-test-baseline.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(metrics, null, 2), 'utf-8');
    console.log(`Load test completed: ${metrics.throughputReqPerSec} req/sec, error rate ${metrics.errorRatePercent}%`);
    console.log(`Saved report to ${reportPath}`);
    process.exit(0);
  });
}
