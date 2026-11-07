/**
 * Bundle Size Measurement Script (Phase 13.9.1, Task 13 — A3 Reconciliation)
 *
 * Measures production asset sizes and verifies compliance with gzip budgets:
 * - Main entry gzip <= 180.00 KB
 * - Total JS gzip <= 260.00 KB
 * Outputs: reports/bundle-post-13.9.json
 *
 * Epistemic & Methodological Guardrails:
 * - Scope: strictly dist/assets (client bundles). Server runtime files are excluded.
 * - Compression: Node.js standard zlib.gzipSync (default compression level 6).
 * - Historical snapshots (e.g. reports/bundle-post-13.json) are strictly preserved read-only.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export interface BundleMethodology {
  readonly scope: 'dist/assets';
  readonly compression: 'zlib.gzipSync (default)';
  readonly mainEntryPattern: 'index-*.js';
  readonly excludesServer: true;
}

export const BUNDLE_METHODOLOGY: BundleMethodology = Object.freeze({
  scope: 'dist/assets',
  compression: 'zlib.gzipSync (default)',
  mainEntryPattern: 'index-*.js',
  excludesServer: true,
});

export interface BundleMetrics {
  readonly timestamp: string;
  readonly phase: string;
  readonly methodology: BundleMethodology;
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
  readonly chunks: Array<{ readonly name: string; readonly gzipKb: number }>;
  readonly files: Record<string, { rawBytes: number; gzipBytes: number; gzipKb: number }>;
  readonly status: 'PASS' | 'FAIL';
  readonly verdict: 'PASS' | 'FAIL';
  readonly marginMainKb: number;
  readonly marginTotalKb: number;
}

export function evaluateBundleBudget(
  mainKb: number,
  totalJsKb: number,
  budgetLimits = { mainBundleGzipMaxKb: 180.0, totalJsGzipMaxKb: 260.0 }
): { status: 'PASS' | 'FAIL'; message: string; marginMainKb: number; marginTotalKb: number } {
  const passes = mainKb <= budgetLimits.mainBundleGzipMaxKb && totalJsKb <= budgetLimits.totalJsGzipMaxKb;
  const marginMainKb = Number((budgetLimits.mainBundleGzipMaxKb - mainKb).toFixed(2));
  const marginTotalKb = Number((budgetLimits.totalJsGzipMaxKb - totalJsKb).toFixed(2));

  return {
    status: passes ? 'PASS' : 'FAIL',
    message: passes
      ? `PASS: Main entry ${mainKb} KB <= ${budgetLimits.mainBundleGzipMaxKb} KB, Total JS ${totalJsKb} KB <= ${budgetLimits.totalJsGzipMaxKb} KB`
      : `FAIL: Budget exceeded. Main: ${mainKb}/${budgetLimits.mainBundleGzipMaxKb} KB, Total: ${totalJsKb}/${budgetLimits.totalJsGzipMaxKb} KB`,
    marginMainKb,
    marginTotalKb,
  };
}

export function measureBundle(options?: { distDir?: string; outputFile?: string }): BundleMetrics {
  const distPath = path.resolve(options?.distDir ?? 'dist');
  if (!fs.existsSync(distPath)) {
    throw new Error('dist/ directory does not exist. Run "npm run build" first.');
  }

  const assetsPath = path.join(distPath, 'assets');
  const assetFiles = fs.existsSync(assetsPath) ? fs.readdirSync(assetsPath) : [];

  const filesMap: Record<string, { rawBytes: number; gzipBytes: number; gzipKb: number }> = {};
  const chunksList: Array<{ name: string; gzipKb: number }> = [];
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
      chunksList.push({ name: file, gzipKb });
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

  const evalResult = evaluateBundleBudget(mainKb, totalJsKb, budgetLimits);

  chunksList.sort((a, b) => b.gzipKb - a.gzipKb);

  const metrics: BundleMetrics = {
    timestamp: new Date().toISOString(),
    phase: '14.9.1',
    methodology: BUNDLE_METHODOLOGY,
    budgetLimits,
    measured: {
      mainEntryGzipKb: mainKb,
      totalJsGzipKb: totalJsKb,
      totalJsRawKb: totalJsRawKb,
      cssGzipKb: cssKb,
      htmlGzipKb: htmlKb,
    },
    chunks: chunksList,
    files: filesMap,
    status: evalResult.status,
    verdict: evalResult.status,
    marginMainKb: evalResult.marginMainKb,
    marginTotalKb: evalResult.marginTotalKb,
  };

  // Parse CLI args for --out
  let cliOutputFile = 'reports/bundle-post-14.json';
  const args = process.argv.slice(2);
  const outIndex = args.indexOf('--out');
  if (outIndex !== -1 && args[outIndex + 1]) {
    cliOutputFile = args[outIndex + 1];
  } else if (args[0] && !args[0].startsWith('--')) {
    cliOutputFile = args[0];
  }

  const reportFile = options?.outputFile ?? process.env.BUNDLE_OUTPUT_FILE ?? cliOutputFile;
  const reportPath = path.resolve(reportFile);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(metrics, null, 2), 'utf-8');
  console.log(`Bundle metrics recorded to ${reportPath}: Status ${metrics.status}`);
  console.log(`  Main Entry: ${mainKb} KB (Budget <= ${budgetLimits.mainBundleGzipMaxKb} KB, Margin +${evalResult.marginMainKb} KB)`);
  console.log(`  Total JS:   ${totalJsKb} KB (Budget <= ${budgetLimits.totalJsGzipMaxKb} KB, Margin +${evalResult.marginTotalKb} KB)`);
  console.log(`  Methodology: ${JSON.stringify(metrics.methodology)}`);

  return metrics;
}

if (process.argv[1]?.endsWith('measure-bundle.ts')) {
  try {
    let outputFile = 'reports/bundle-post-14.json';
    const args = process.argv.slice(2);
    const outIndex = args.indexOf('--out');
    if (outIndex !== -1 && args[outIndex + 1]) {
      outputFile = args[outIndex + 1];
    } else if (args[0] && !args[0].startsWith('--')) {
      outputFile = args[0];
    } else if (process.env.BUNDLE_OUTPUT_FILE) {
      outputFile = process.env.BUNDLE_OUTPUT_FILE;
    }
    const res = measureBundle({ outputFile });
    if (res.status !== 'PASS') {
      console.warn(`[WARNING] Bundle exceeds recommended budget limits: ${res.status}`);
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
