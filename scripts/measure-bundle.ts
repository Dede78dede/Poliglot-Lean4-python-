/**
 * Bundle Size Measurement Script (Phase 13.9, Task 01 / 09)
 *
 * Measures production asset sizes and verifies compliance with gzip budgets:
 * - Main entry gzip <= 180.00 KB
 * - Total JS gzip <= 260.00 KB
 * Outputs: reports/bundle-post-13.9.json
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

interface BundleMetrics {
  readonly timestamp: string;
  readonly phase: string;
  readonly budgetLimits: {
    readonly mainBundleGzipMaxKb: number;
    readonly totalJsGzipMaxKb: number;
  };
  readonly measured: {
    readonly mainEntryGzipKb: number;
    readonly totalJsGzipKb: number;
    readonly totalJsRawKb: number;
    readonly cssGzipKb: number;
    readonly htmlGzipKb: number;
  };
  readonly files: Record<string, { rawBytes: number; gzipBytes: number; gzipKb: number }>;
  readonly status: 'PASS' | 'FAIL';
  readonly marginMainKb: number;
  readonly marginTotalKb: number;
}

export function measureBundle(): BundleMetrics {
  const distPath = path.resolve('dist');
  if (!fs.existsSync(distPath)) {
    throw new Error('dist/ directory does not exist. Run "npm run build" first.');
  }

  const assetsPath = path.join(distPath, 'assets');
  const assetFiles = fs.existsSync(assetsPath) ? fs.readdirSync(assetsPath) : [];

  const filesMap: Record<string, { rawBytes: number; gzipBytes: number; gzipKb: number }> = {};
  let totalJsRaw = 0;
  let totalJsGzip = 0;
  let mainGzip = 0;
  let cssGzip = 0;

  for (const file of assetFiles) {
    const fullPath = path.join(assetsPath, file);
    if (!fs.statSync(fullPath).isFile()) continue;
    const content = fs.readFileSync(fullPath);
    const rawBytes = content.length;
    const gzipBytes = zlib.gzipSync(content).length;
    const gzipKb = Number((gzipBytes / 1024).toFixed(2));

    filesMap[file] = { rawBytes, gzipBytes, gzipKb };

    if (file.endsWith('.js')) {
      totalJsRaw += rawBytes;
      totalJsGzip += gzipBytes;
      if (file.startsWith('index-')) {
        mainGzip = gzipBytes;
      }
    } else if (file.endsWith('.css')) {
      cssGzip += gzipBytes;
    }
  }

  // HTML file
  const htmlPath = path.join(distPath, 'index.html');
  let htmlGzip = 0;
  if (fs.existsSync(htmlPath)) {
    const content = fs.readFileSync(htmlPath);
    htmlGzip = zlib.gzipSync(content).length;
    filesMap['index.html'] = {
      rawBytes: content.length,
      gzipBytes: htmlGzip,
      gzipKb: Number((htmlGzip / 1024).toFixed(2)),
    };
  }

  const mainKb = Number((mainGzip / 1024).toFixed(2));
  const totalJsKb = Number((totalJsGzip / 1024).toFixed(2));
  const totalJsRawKb = Number((totalJsRaw / 1024).toFixed(2));
  const cssKb = Number((cssGzip / 1024).toFixed(2));
  const htmlKb = Number((htmlGzip / 1024).toFixed(2));

  const budgetLimits = {
    mainBundleGzipMaxKb: 180.0,
    totalJsGzipMaxKb: 260.0,
  };

  const status = mainKb <= budgetLimits.mainBundleGzipMaxKb && totalJsKb <= budgetLimits.totalJsGzipMaxKb ? 'PASS' : 'FAIL';
  const marginMainKb = Number((budgetLimits.mainBundleGzipMaxKb - mainKb).toFixed(2));
  const marginTotalKb = Number((budgetLimits.totalJsGzipMaxKb - totalJsKb).toFixed(2));

  const metrics: BundleMetrics = {
    timestamp: new Date().toISOString(),
    phase: '13.9',
    budgetLimits,
    measured: {
      mainEntryGzipKb: mainKb,
      totalJsGzipKb: totalJsKb,
      totalJsRawKb: totalJsRawKb,
      cssGzipKb: cssKb,
      htmlGzipKb: htmlKb,
    },
    files: filesMap,
    status,
    marginMainKb,
    marginTotalKb,
  };

  const reportPath = path.resolve('reports/bundle-post-13.9.json');
  fs.writeFileSync(reportPath, JSON.stringify(metrics, null, 2), 'utf-8');
  console.log(`Bundle metrics recorded to ${reportPath}: Status ${status}`);
  console.log(`  Main Entry: ${mainKb} KB (Budget <= ${budgetLimits.mainBundleGzipMaxKb} KB, Margin +${marginMainKb} KB)`);
  console.log(`  Total JS:   ${totalJsKb} KB (Budget <= ${budgetLimits.totalJsGzipMaxKb} KB, Margin +${marginTotalKb} KB)`);

  return metrics;
}

if (process.argv[1]?.endsWith('measure-bundle.ts')) {
  try {
    const res = measureBundle();
    if (res.status !== 'PASS') {
      console.error('Bundle exceeds budget caps!');
      process.exit(1);
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
