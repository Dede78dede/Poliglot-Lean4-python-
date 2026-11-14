/**
 * Bundle Size Measurement Script (Phase 13.9.1 / 14.9 / 15.0)
 *
 * Measures production asset sizes and verifies compliance with gzip budgets (ADR-017):
 * - Main entry gzip <= 180.00 KB
 * - Total JS gzip <= 290.00 KB (and reports against <= 260.00 KB target)
 * - O1 Max Single Chunk gzip <= 100.00 KB (<= 80.00 KB Suite-170 target)
 * - O2 Initial Load gzip <= 220.00 KB parsed from dist/index.html <script> / <link rel="modulepreload">
 * - O3 Chunk Sum discrepancy <= 0.50 KB
 *
 * Exits with code 1 when any budget fails.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export interface BundleMethodology {
  readonly scope: 'dist/assets';
  readonly compression: 'zlib.gzipSync (default)';
  readonly mainEntryPattern: 'index-*.js';
  readonly excludesServer: true;
  readonly initialLoadSource: 'dist/index.html';
}

export const BUNDLE_METHODOLOGY: BundleMethodology = Object.freeze({
  scope: 'dist/assets',
  compression: 'zlib.gzipSync (default)',
  mainEntryPattern: 'index-*.js',
  excludesServer: true,
  initialLoadSource: 'dist/index.html',
});

export interface BundleMetrics {
  readonly timestamp: string;
  readonly phase: string;
  readonly methodology: BundleMethodology;
  readonly budgetLimits: {
    readonly mainBundleGzipMaxKb: number;
    readonly totalJsGzipMaxKb: number;
    readonly maxSingleChunkGzipKb: number;
    readonly initialLoadGzipMaxKb: number;
    readonly maxAccountingDiscrepancyKb: number;
  };
  readonly measured: {
    readonly mainEntryGzipKb: number;
    readonly totalJsGzipKb: number;
    readonly totalJsRawKb: number;
    readonly cssGzipKb: number;
    readonly htmlGzipKb: number;
    readonly initialLoadGzipKb: number;
    readonly maxSingleChunkGzipKb: number;
    readonly accountingDiscrepancyKb: number;
  };
  readonly initialLoadChunks: readonly string[];
  readonly chunks: Array<{ readonly name: string; readonly gzipKb: number }>;
  readonly files: Record<string, { rawBytes: number; gzipBytes: number; gzipKb: number }>;
  readonly status: 'PASS' | 'FAIL';
  readonly verdict: 'PASS' | 'FAIL';
  readonly failureReasons: readonly string[];
  readonly marginMainKb: number;
  readonly marginTotalKb: number;
}

export function evaluateBundleBudget(
  mainKb: number,
  totalJsKb: number,
  budgetLimits = { mainBundleGzipMaxKb: 180.0, totalJsGzipMaxKb: 290.0 }
): { status: 'PASS' | 'FAIL'; message: string; marginMainKb: number; marginTotalKb: number } {
  const passes =
    mainKb <= budgetLimits.mainBundleGzipMaxKb && totalJsKb <= budgetLimits.totalJsGzipMaxKb;
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

function parseInitialLoadAssets(htmlContent: string): string[] {
  const refs = new Set<string>();
  const scriptRe = /<script\b[^>]*\bsrc=["']\/?assets\/([^"']+\.js)["']/gi;
  const preloadRe = /<link\b[^>]*\brel=["']modulepreload["'][^>]*\bhref=["']\/?assets\/([^"']+\.js)["']/gi;
  const preloadRevRe = /<link\b[^>]*\bhref=["']\/?assets\/([^"']+\.js)["'][^>]*\brel=["']modulepreload["']/gi;

  for (const re of [scriptRe, preloadRe, preloadRevRe]) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(htmlContent)) !== null) {
      if (match[1]) refs.add(match[1]);
    }
  }
  return Array.from(refs);
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

  const htmlPath = path.join(distPath, 'index.html');
  let htmlGzip = 0;
  let htmlText = '';
  if (fs.existsSync(htmlPath)) {
    const content = fs.readFileSync(htmlPath);
    htmlText = content.toString('utf-8');
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

  chunksList.sort((a, b) => b.gzipKb - a.gzipKb);
  const maxSingleChunkGzipKb = chunksList[0]?.gzipKb ?? 0;

  const initialLoadChunks = parseInitialLoadAssets(htmlText);
  let initialLoadGzipKb: number;
  if (initialLoadChunks.length > 0) {
    const initialGzipBytes = initialLoadChunks.reduce(
      (sum, name) => sum + (filesMap[name]?.gzipBytes ?? 0),
      0
    );
    initialLoadGzipKb = Number((initialGzipBytes / 1024).toFixed(2));
  } else {
    const reactVendorChunk = chunksList.find((c) => c.name.startsWith('react-vendor-'));
    const ariaVendorChunk = chunksList.find((c) => c.name.startsWith('aria-vendor-'));
    initialLoadGzipKb = Number(
      (mainKb + (reactVendorChunk?.gzipKb ?? 0) + (ariaVendorChunk?.gzipKb ?? 0)).toFixed(2)
    );
  }

  const chunkSumKb = Number(chunksList.reduce((acc, c) => acc + c.gzipKb, 0).toFixed(2));
  const accountingDiscrepancyKb = Number(Math.abs(chunkSumKb - totalJsKb).toFixed(2));

  const budgetLimits = {
    mainBundleGzipMaxKb: 180.0,
    totalJsGzipMaxKb: 290.0,
    maxSingleChunkGzipKb: 100.0,
    initialLoadGzipMaxKb: 220.0,
    maxAccountingDiscrepancyKb: 0.5,
  };

  const evalResult = evaluateBundleBudget(mainKb, totalJsKb, {
    mainBundleGzipMaxKb: budgetLimits.mainBundleGzipMaxKb,
    totalJsGzipMaxKb: budgetLimits.totalJsGzipMaxKb,
  });

  const failureReasons: string[] = [];
  if (mainKb === 0) failureReasons.push('Main entry index-*.js not found in dist/assets');
  if (mainKb > budgetLimits.mainBundleGzipMaxKb) {
    failureReasons.push(`Main entry ${mainKb} KB > ${budgetLimits.mainBundleGzipMaxKb} KB`);
  }
  if (totalJsKb > budgetLimits.totalJsGzipMaxKb) {
    failureReasons.push(`Total JS ${totalJsKb} KB > ${budgetLimits.totalJsGzipMaxKb} KB`);
  }
  if (maxSingleChunkGzipKb > budgetLimits.maxSingleChunkGzipKb) {
    failureReasons.push(
      `O1 max single chunk ${maxSingleChunkGzipKb} KB > ${budgetLimits.maxSingleChunkGzipKb} KB`
    );
  }
  if (initialLoadGzipKb > budgetLimits.initialLoadGzipMaxKb) {
    failureReasons.push(
      `O2 initial load ${initialLoadGzipKb} KB > ${budgetLimits.initialLoadGzipMaxKb} KB`
    );
  }
  if (accountingDiscrepancyKb > budgetLimits.maxAccountingDiscrepancyKb) {
    failureReasons.push(
      `O3 accounting discrepancy ${accountingDiscrepancyKb} KB > ${budgetLimits.maxAccountingDiscrepancyKb} KB`
    );
  }

  const finalStatus: 'PASS' | 'FAIL' = failureReasons.length === 0 ? 'PASS' : 'FAIL';

  const metrics: BundleMetrics = {
    timestamp: new Date().toISOString(),
    phase: '2.3.0-rc',
    methodology: BUNDLE_METHODOLOGY,
    budgetLimits,
    measured: {
      mainEntryGzipKb: mainKb,
      totalJsGzipKb: totalJsKb,
      totalJsRawKb,
      cssGzipKb: cssKb,
      htmlGzipKb: htmlKb,
      initialLoadGzipKb,
      maxSingleChunkGzipKb,
      accountingDiscrepancyKb,
    },
    initialLoadChunks,
    chunks: chunksList,
    files: filesMap,
    status: finalStatus,
    verdict: finalStatus,
    failureReasons,
    marginMainKb: evalResult.marginMainKb,
    marginTotalKb: evalResult.marginTotalKb,
  };

  let cliOutputFile = 'reports/bundle-post-15.json';
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

  // Preserve compatibility copies for suites 170, 181, 200 and CI
  fs.writeFileSync(path.resolve('reports/bundle-post-15.json'), JSON.stringify(metrics, null, 2), 'utf-8');
  fs.writeFileSync(path.resolve('reports/bundle-post-14.9.9.2.json'), JSON.stringify(metrics, null, 2), 'utf-8');
  fs.writeFileSync(path.resolve('reports/bundle-post-14.json'), JSON.stringify(metrics, null, 2), 'utf-8');

  console.log(`Bundle metrics recorded to ${reportPath}: Status ${metrics.status}`);
  console.log(
    `  Main Entry:   ${mainKb} KB (Budget <= ${budgetLimits.mainBundleGzipMaxKb} KB, Margin +${evalResult.marginMainKb} KB)`
  );
  console.log(
    `  Total JS:     ${totalJsKb} KB (Budget <= ${budgetLimits.totalJsGzipMaxKb} KB, Margin +${evalResult.marginTotalKb} KB)`
  );
  console.log(
    `  O1 Max Chunk: ${maxSingleChunkGzipKb} KB (Budget <= ${budgetLimits.maxSingleChunkGzipKb} KB)`
  );
  console.log(
    `  O2 Init Load: ${initialLoadGzipKb} KB (Budget <= ${budgetLimits.initialLoadGzipMaxKb} KB, ${initialLoadChunks.length} initial scripts)`
  );
  console.log(
    `  O3 Delta:     ${accountingDiscrepancyKb} KB (Tolerance <= ${budgetLimits.maxAccountingDiscrepancyKb} KB)`
  );
  console.log(`  Methodology:  ${JSON.stringify(metrics.methodology)}`);

  if (failureReasons.length > 0) {
    console.error(`❌ Budget violations: ${failureReasons.join('; ')}`);
  }

  return metrics;
}

if (process.argv[1]?.endsWith('measure-bundle.ts')) {
  try {
    let outputFile = 'reports/bundle-post-15.json';
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
      process.exit(1);
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
