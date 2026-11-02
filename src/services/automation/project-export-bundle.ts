/**
 * Project Export Bundle Service (Sprint 11.0.2, Task A1)
 *
 * Produces a .polyglot bundle (ZIP) adhering to the RO-Crate research standard:
 * - VFS files (excluding build caches)
 * - settings.json
 * - feature-flags.json
 * - audit-log.json
 * - bibliography.json
 * - blueprint-dag.json
 * - manifest.json (RO-Crate Metadata v1.1)
 * Computes SHA-256 integrity hash and size.
 */

import * as fflate from 'fflate';
import { computeSha256 } from '../storage/hash-utils';
import { EXCLUDED_ARCHIVE_PATHS } from './auto-archive';

export interface ProjectBundleInput {
  readonly projectId: string;
  readonly projectName: string;
  readonly vfsFiles: Record<string, string>;
  readonly settings?: Record<string, unknown>;
  readonly flags?: Record<string, boolean>;
  readonly auditLog?: readonly unknown[];
  readonly bibliography?: readonly unknown[];
  readonly blueprintDag?: Record<string, unknown>;
}

export interface ProjectBundleOutput {
  readonly zipBytes: Uint8Array;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly manifestJson: string;
  readonly fileCount: number;
}

export async function createProjectExportBundle(
  input: ProjectBundleInput
): Promise<ProjectBundleOutput> {
  const zipObj: Record<string, Uint8Array> = {};

  // 1. Pack VFS files excluding transient paths
  let fileCount = 0;
  for (const [path, content] of Object.entries(input.vfsFiles)) {
    const isExcluded = EXCLUDED_ARCHIVE_PATHS.some(
      (exc) => path.startsWith(exc) || path.includes(`/${exc}/`)
    );
    if (!isExcluded) {
      zipObj[`vfs/${path.replace(/^\//, '')}`] = fflate.strToU8(content);
      fileCount++;
    }
  }

  // 2. Metadata files
  zipObj['meta/settings.json'] = fflate.strToU8(
    JSON.stringify(input.settings ?? {}, null, 2)
  );
  zipObj['meta/feature-flags.json'] = fflate.strToU8(
    JSON.stringify(input.flags ?? {}, null, 2)
  );
  zipObj['meta/audit-log.json'] = fflate.strToU8(
    JSON.stringify(input.auditLog ?? [], null, 2)
  );
  zipObj['meta/bibliography.json'] = fflate.strToU8(
    JSON.stringify(input.bibliography ?? [], null, 2)
  );
  zipObj['meta/blueprint-dag.json'] = fflate.strToU8(
    JSON.stringify(input.blueprintDag ?? {}, null, 2)
  );

  // 3. RO-Crate manifest.json
  const manifest = {
    '@context': 'https://w3id.org/ro/crate/1.1/context',
    '@graph': [
      {
        '@type': 'CreativeWork',
        '@id': 'ro-crate-metadata.json',
        conformsTo: { '@id': 'https://w3id.org/ro/crate/1.1' },
        about: { '@id': './' },
      },
      {
        '@id': './',
        '@type': 'Dataset',
        name: input.projectName,
        identifier: input.projectId,
        description: 'Polyglot Code Studio dual-runtime research project export bundle',
        datePublished: new Date().toISOString(),
        hasPart: Object.keys(zipObj).map((p) => ({ '@id': p })),
      },
    ],
  };

  const manifestStr = JSON.stringify(manifest, null, 2);
  zipObj['manifest.json'] = fflate.strToU8(manifestStr);
  zipObj['ro-crate-metadata.json'] = fflate.strToU8(manifestStr);

  // 4. Compress to ZIP
  const zipBytes = fflate.zipSync(zipObj, { level: 6 });
  const sha256 = await computeSha256(zipBytes);

  return {
    zipBytes,
    sha256,
    sizeBytes: zipBytes.byteLength,
    manifestJson: manifestStr,
    fileCount: Object.keys(zipObj).length,
  };
}
