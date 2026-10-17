import { Router, type Request, type Response } from 'express';
import * as fflate from 'fflate';
import {
  CURATED_PACKAGES,
  discoveryEngine,
} from '../../../src/services/discovery/DiscoveryEngine';
import { evaluateLeanCompatibility } from '../../../src/services/discovery/LeanDependencyResolver';
import {
  evaluatePythonCompatibility,
  extractRequiresPython,
} from '../../../src/services/discovery/PythonDependencyResolver';
import {
  validateZipEntries,
  GITHUB_IMPORT_LIMITS,
  type ZipValidationEntry,
} from '../../../src/services/zip-validator';
import type {
  DiscoveryEcosystem,
  DiscoverySearchResult,
  PackageMetadata,
  ToolchainCompatibilityReport,
} from '../../../src/types/discovery';
import type { Project, ProjectFile } from '../../../src/types/projects';

export const MAX_STREAM_BYTES = GITHUB_IMPORT_LIMITS.MAX_STREAM_BYTES; // 500 MiB (524,288,000 bytes)
export const GITHUB_IMPORT_UNCOMPRESSED_LIMIT = GITHUB_IMPORT_LIMITS.MAX_TOTAL_UNCOMPRESSED_BYTES; // 200 MB

/**
 * Dynamically derives Python toolchain and tag metadata from project files.
 * Replaces hardcoded stubs for Gap 2.
 */
export function derivePythonMetadata(
  files: readonly { readonly path: string; readonly content: string }[],
  repoTopics: readonly string[] = [],
): {
  pythonVersion: string;
  purePython: boolean;
  pyodideCompatible: boolean;
  tags: readonly string[];
  report: ToolchainCompatibilityReport;
} {
  const report = evaluatePythonCompatibility(files);

  // 1. Extract requires-python from pyproject.toml, setup.cfg, or environment.yml
  let pythonVersion = '>=3.11';
  for (const file of files) {
    if (
      file.path === 'pyproject.toml' ||
      file.path.endsWith('/pyproject.toml') ||
      file.path === 'setup.cfg' ||
      file.path.endsWith('/setup.cfg') ||
      file.path === 'environment.yml' ||
      file.path.endsWith('/environment.yml')
    ) {
      const extracted = extractRequiresPython(file.content);
      if (extracted) {
        pythonVersion = extracted;
        break;
      }
    }
  }

  // 2. Evaluate pure Python and Pyodide WASM readiness
  const hasUnsupported = report.pythonAnalysis?.hasUnsupportedCExtensions ?? false;
  const purePython = !hasUnsupported;
  const pyodideCompatible = report.status === 'compatible';

  // 3. Dynamic tag generation
  const tagSet = new Set<string>(['python', 'github-repo', ...repoTopics]);
  if (purePython) {
    tagSet.add('pure-python');
    tagSet.add('wasm-ready');
  } else {
    tagSet.add('c-extension');
    tagSet.add('requires-backend');
  }

  const reqNames = report.pythonAnalysis?.requirements.map((r) => r.name) ?? [];
  if (reqNames.some((n) => ['numpy', 'scipy', 'sympy', 'matplotlib', 'pandas'].includes(n))) {
    tagSet.add('scientific');
    tagSet.add('math');
  }

  return {
    pythonVersion,
    purePython,
    pyodideCompatible,
    tags: Array.from(tagSet),
    report,
  };
}

/**
 * Core ingestion logic for uncompressed or streamed zipball archives.
 */
export function processRepositoryZipBytes(
  zipBytes: Uint8Array,
  repoName: string,
  owner = 'github',
  repoDescription?: string,
  starsCount = 0,
  licenseSpdx = 'Unknown',
): {
  project: Project;
  package: PackageMetadata;
  report: ToolchainCompatibilityReport;
} {
  // 1. Decompress entries using fflate
  const decompressed = fflate.unzipSync(zipBytes);
  const rawPaths = Object.keys(decompressed);

  if (rawPaths.length === 0) {
    throw new Error('Empty ZIP archive: no entries found.');
  }

  // Detect and strip GitHub's root wrapper directory (e.g. "owner-repo-commit/...")
  const firstSlashIdx = rawPaths[0]?.indexOf('/') ?? -1;
  const commonPrefix =
    firstSlashIdx > 0 ? rawPaths[0]?.substring(0, firstSlashIdx + 1) : null;

  const hasUniformPrefix =
    commonPrefix !== null &&
    rawPaths.every((p) => p.startsWith(commonPrefix) || p === commonPrefix.slice(0, -1));

  const validationEntries: ZipValidationEntry[] = [];
  const processedFiles: { path: string; data: Uint8Array }[] = [];

  for (const rawPath of rawPaths) {
    const stripped = hasUniformPrefix && commonPrefix ? rawPath.slice(commonPrefix.length) : rawPath;
    if (!stripped || stripped.endsWith('/')) {
      continue;
    }

    const data = decompressed[rawPath]!;
    validationEntries.push({
      path: stripped,
      uncompressedSize: data.byteLength,
    });
    processedFiles.push({ path: stripped, data });
  }

  // 2. Validate entries through ZipValidator with the differentiated 200 MB limit
  const validation = validateZipEntries(validationEntries, zipBytes.byteLength, {
    maxTotalUncompressedBytes: GITHUB_IMPORT_UNCOMPRESSED_LIMIT,
  });

  if (!validation.valid) {
    const err = new Error(`Zip validation failed: ${validation.errors.join('; ')}`);
    (err as unknown as { validationErrors: readonly string[] }).validationErrors = validation.errors;
    throw err;
  }

  // 3. Convert valid entries to project files
  const projectFiles: ProjectFile[] = processedFiles.map(({ path: filePath, data }) => {
    let language: ProjectFile['language'] = 'text';
    const lower = filePath.toLowerCase();
    if (lower.endsWith('.py')) language = 'python';
    else if (lower.endsWith('.lean')) language = 'lean4';

    const content = fflate.strFromU8(data);
    return {
      path: filePath,
      content,
      language,
      isDirty: false,
    };
  });

  // 4. Determine ecosystem
  const isLean = projectFiles.some(
    (f) =>
      f.path === 'lean-toolchain' ||
      f.path.endsWith('/lean-toolchain') ||
      f.path === 'lakefile.lean' ||
      f.path.endsWith('/lakefile.lean') ||
      f.path.endsWith('.lean'),
  );

  const ecosystem: 'lean4' | 'python' = isLean ? 'lean4' : 'python';

  // 5. Evaluate compatibility & derive metadata
  let report: ToolchainCompatibilityReport;
  let toolchain: PackageMetadata['toolchain'];
  let tags: readonly string[];

  if (ecosystem === 'python') {
    const derived = derivePythonMetadata(projectFiles);
    report = derived.report;
    toolchain = {
      pythonVersion: derived.pythonVersion,
      purePython: derived.purePython,
      pyodideCompatible: derived.pyodideCompatible,
    };
    tags = derived.tags;
  } else {
    report = evaluateLeanCompatibility(projectFiles);
    const toolchainFile = projectFiles.find((f) => f.path.endsWith('lean-toolchain'));
    const leanVersion = toolchainFile ? toolchainFile.content.trim() : 'v4.35.0-rc4';
    toolchain = { leanVersion };
    tags = ['lean4', 'github-repo', 'formal-verification'];
  }

  const now = new Date().toISOString();
  const projectId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `proj-${Date.now()}`;

  const project: Project = {
    id: projectId,
    name: repoName,
    type: ecosystem,
    files: projectFiles,
    createdAt: now,
    updatedAt: now,
    isPinned: false,
  };

  const pkg: PackageMetadata = {
    id: `gh-${ecosystem}-${owner}-${repoName}`,
    name: repoName,
    description: repoDescription ?? `Repository ${owner}/${repoName} da GitHub`,
    author: owner,
    repositoryUrl: `https://github.com/${owner}/${repoName}`,
    stars: starsCount,
    license: licenseSpdx,
    ecosystem,
    version: '1.0.0',
    tags,
    category: ecosystem === 'lean4' ? 'logic' : 'scientific',
    toolchain,
    files: projectFiles.map((f) => ({
      path: f.path,
      content: f.content,
      language: f.language,
    })),
  };

  return { project, package: pkg, report };
}

export function createDiscoveryRouter(): Router {
  const router = Router();
  const serverCache = new Map<string, { result: DiscoverySearchResult; expiresAt: number }>();
  const CACHE_TTL_MS = 10 * 60 * 1000;

  // GET /api/v1/discovery/search
  router.get('/search', async (req: Request, res: Response): Promise<void> => {
    const q = typeof req.query['q'] === 'string' ? req.query['q'].trim() : '';
    const ecosystem = (
      typeof req.query['ecosystem'] === 'string' &&
      ['lean4', 'python', 'all'].includes(req.query['ecosystem'])
        ? req.query['ecosystem']
        : 'all'
    ) as DiscoveryEcosystem;

    const cacheKey = `${ecosystem}:${q.toLowerCase()}`;
    const cached = serverCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.json(cached.result);
      return;
    }

    // Curated local packages matching criteria
    const curatedMatches = CURATED_PACKAGES.filter((pkg: PackageMetadata) => {
      if (ecosystem !== 'all' && pkg.ecosystem !== ecosystem) return false;
      if (!q) return true;
      const lower = q.toLowerCase();
      return (
        pkg.name.toLowerCase().includes(lower) ||
        pkg.description.toLowerCase().includes(lower) ||
        pkg.tags.some((t: string) => t.toLowerCase().includes(lower)) ||
        pkg.author.toLowerCase().includes(lower)
      );
    });

    const results: PackageMetadata[] = [...curatedMatches];

    // Live search attempts if query provided (with timeout)
    if (q) {
      const searchLanguages: ('lean' | 'python')[] = [];
      if (ecosystem === 'lean4' || ecosystem === 'all') searchLanguages.push('lean');
      if (ecosystem === 'python' || ecosystem === 'all') searchLanguages.push('python');

      for (const lang of searchLanguages) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3500);

          const ghRes = await fetch(
            `https://api.github.com/search/repositories?q=${encodeURIComponent(
              q,
            )}+language:${lang}+stars:>0&sort=stars&order=desc&per_page=5`,
            {
              headers: {
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'Polyglot-Code-Studio/1.1',
                ...(req.headers['authorization']
                  ? { Authorization: req.headers['authorization'] as string }
                  : {}),
              },
              signal: controller.signal,
            },
          );
          clearTimeout(timer);

          // Check rate limit status
          const remaining = ghRes.headers.get('x-ratelimit-remaining');
          const resetHeader = ghRes.headers.get('x-ratelimit-reset');

          if (ghRes.status === 429 || (ghRes.status === 403 && remaining === '0')) {
            const resetAt = resetHeader
              ? new Date(Number(resetHeader) * 1000).toISOString()
              : new Date(Date.now() + 60_000).toISOString();
            const retrySeconds = resetHeader
              ? Math.max(1, Math.ceil(Number(resetHeader) - Date.now() / 1000))
              : 60;

            res.setHeader('Retry-After', String(retrySeconds));
            res.status(429).json({
              results: [],
              warning: 'RATE_LIMITED',
              resetAt,
            });
            return;
          }

          if (ghRes.ok) {
            const data = (await ghRes.json()) as {
              items?: Array<{
                id: number;
                name: string;
                description: string | null;
                stargazers_count: number;
                html_url: string;
                owner?: { login: string };
                license?: { spdx_id?: string };
              }>;
            };

            if (data.items) {
              for (const item of data.items) {
                if (!results.some((r) => r.repositoryUrl === item.html_url)) {
                  const pkgEcosystem = lang === 'lean' ? 'lean4' : 'python';
                  results.push({
                    id: `gh-${pkgEcosystem}-${item.id}`,
                    name: item.name,
                    description: item.description ?? `Repository ${item.name} da GitHub`,
                    author: item.owner?.login ?? 'github',
                    repositoryUrl: item.html_url,
                    stars: item.stargazers_count,
                    license: item.license?.spdx_id ?? 'Unknown',
                    ecosystem: pkgEcosystem,
                    version: '1.0.0',
                    tags: [pkgEcosystem, 'github-repo'],
                    category: pkgEcosystem === 'lean4' ? 'logic' : 'scientific',
                    toolchain:
                      pkgEcosystem === 'lean4'
                        ? { leanVersion: 'v4.35.0-rc4' }
                        : {
                            pythonVersion: '>=3.11',
                            purePython: true,
                            pyodideCompatible: true,
                          },
                    files: [
                      {
                        path: pkgEcosystem === 'lean4' ? `${item.name}.lean` : 'main.py',
                        content: `# Repository: ${item.html_url}\nprint("Import ready for ${item.name}")\n`,
                        language: pkgEcosystem === 'lean4' ? 'lean4' : 'python',
                      },
                    ],
                  });
                }
              }
            }
          }
        } catch {
          // Graceful fallback to cached/curated items on connection failure
        }
      }
    }

    const payload: DiscoverySearchResult = {
      packages: results,
      results,
      total: results.length,
      source: 'reservoir',
    };

    serverCache.set(cacheKey, {
      result: payload,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    res.json(payload);
  });

  // POST /api/v1/discovery/import (Gap 1 & Gap 2)
  router.post('/import', async (req: Request, res: Response): Promise<void> => {
    const body = req.body as {
      owner?: string;
      repo?: string;
      ref?: string;
      repositoryUrl?: string;
      token?: string;
    };

    let owner = body.owner?.trim();
    let repo = body.repo?.trim();
    const ref = body.ref?.trim() || 'HEAD';
    const token = body.token || (req.headers['authorization']?.replace(/^Bearer\s+/i, '') ?? '');

    if (!owner || !repo) {
      if (body.repositoryUrl) {
        try {
          const parsed = new URL(body.repositoryUrl);
          const segments = parsed.pathname.split('/').filter(Boolean);
          if (segments.length >= 2) {
            owner = segments[0];
            repo = segments[1]?.replace(/\.git$/, '');
          }
        } catch {
          // invalid url
        }
      }
    }

    if (!owner || !repo) {
      res.status(400).json({
        error: 'INVALID_PARAMETERS',
        message: 'Must provide owner and repo, or a valid GitHub repositoryUrl.',
      });
      return;
    }

    const zipballUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${encodeURIComponent(ref)}`;
    const headers: Record<string, string> = {
      'User-Agent': 'Polyglot-Code-Studio/1.1',
      Accept: 'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(zipballUrl, {
        headers,
        redirect: 'follow',
      });

      // Handle Rate Limiting (403 with x-ratelimit-remaining: 0 or 429)
      const remaining = response.headers.get('x-ratelimit-remaining');
      const resetHeader = response.headers.get('x-ratelimit-reset');

      if (response.status === 429 || (response.status === 403 && remaining === '0')) {
        const resetAt = resetHeader
          ? new Date(Number(resetHeader) * 1000).toISOString()
          : new Date(Date.now() + 60_000).toISOString();
        const retrySeconds = resetHeader
          ? Math.max(1, Math.ceil(Number(resetHeader) - Date.now() / 1000))
          : 60;

        res.setHeader('Retry-After', String(retrySeconds));
        res.status(429).json({
          results: [],
          warning: 'RATE_LIMITED',
          resetAt,
        });
        return;
      }

      if (!response.ok) {
        res.status(response.status).json({
          error: 'GITHUB_FETCH_FAILED',
          status: response.status,
          message: `Failed to download repository: HTTP ${response.status} ${response.statusText}`,
        });
        return;
      }

      // Stream with 500 MiB hard limit guard
      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader && Number(contentLengthHeader) > MAX_STREAM_BYTES) {
        res.status(413).json({
          error: 'REPO_TOO_LARGE',
          sizeBytes: Number(contentLengthHeader),
          limitBytes: MAX_STREAM_BYTES,
        });
        return;
      }

      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      if (!response.body) {
        res.status(502).json({ error: 'EMPTY_RESPONSE', message: 'No response body from GitHub.' });
        return;
      }

      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > MAX_STREAM_BYTES) {
            await reader.cancel();
            res.status(413).json({
              error: 'REPO_TOO_LARGE',
              sizeBytes: totalBytes,
              limitBytes: MAX_STREAM_BYTES,
            });
            return;
          }
          chunks.push(value);
        }
      }

      // Assemble contiguous byte buffer
      const fullBuffer = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        fullBuffer.set(chunk, offset);
        offset += chunk.byteLength;
      }

      // Process and validate via ZipValidator (200 MB limit)
      const result = processRepositoryZipBytes(fullBuffer, repo, owner);
      res.status(200).json(result);
    } catch (err: unknown) {
      const isValidationErr =
        err && typeof err === 'object' && 'validationErrors' in err;
      if (isValidationErr) {
        res.status(400).json({
          error: 'ZIP_VALIDATION_FAILED',
          message: err instanceof Error ? err.message : 'ZIP validation failed',
          errors: (err as { validationErrors: readonly string[] }).validationErrors,
        });
        return;
      }

      res.status(500).json({
        error: 'IMPORT_ERROR',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // GET /api/v1/discovery/package/:id
  router.get('/package/:id', (req: Request, res: Response) => {
    const pkg = discoveryEngine.getPackageById(req.params['id']);
    if (!pkg) {
      res.status(404).json({ error: `Package ${req.params['id']} not found` });
      return;
    }
    res.json(pkg);
  });

  // POST /api/v1/discovery/inspect
  router.post('/inspect', (req: Request, res: Response) => {
    const body = req.body as {
      ecosystem?: 'lean4' | 'python';
      files?: Array<{ path: string; content: string }>;
    };

    if (!Array.isArray(body.files)) {
      res.status(400).json({ error: 'files must be an array of { path, content }' });
      return;
    }

    const ecosystem = body.ecosystem ?? 'lean4';
    if (ecosystem === 'lean4') {
      const report = evaluateLeanCompatibility(body.files);
      res.json(report);
    } else {
      const report = evaluatePythonCompatibility(body.files);
      res.json(report);
    }
  });

  return router;
}
