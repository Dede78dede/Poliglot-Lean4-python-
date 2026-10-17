import type { Project, ProjectFile } from '../../types/projects';
import type {
  StorageResult,
  SyncStatusResult,
  FileDiffSummary,
  GitHubDeviceCodeResponse,
  GitHubTokenResponse,
  GitHubCommitResult,
  GitHubCommitPayload,
} from '../../types/storage';
import { GitHubDeviceCodeResponseSchema, GitHubTokenResponseSchema } from '../../types/storage';
import { computeSha256 } from './hash-utils';
import { ZIP_EXPORT_EXCLUSIONS } from '../zip-validator';

const GITHUB_API_BASE = 'https://api.github.com';

export interface GitHubRepoSummary {
  readonly id: number;
  readonly name: string;
  readonly fullName: string;
  readonly defaultBranch: string;
  readonly isPrivate: boolean;
  readonly htmlUrl: string;
}

export interface GitHubUserProfile {
  readonly login: string;
  readonly name: string | null;
  readonly avatarUrl: string;
}

export class GitHubProvider {
  readonly id = 'github';
  readonly name = 'GitHub';

  /**
   * Initiates the OAuth 2.0 Device Authorization Flow (RFC 8628).
   * Proxied via backend to avoid browser CORS restrictions.
   */
  async initiateDeviceFlow(clientId?: string): Promise<StorageResult<GitHubDeviceCodeResponse>> {
    try {
      const res = await fetch('/api/v1/auth/github/device/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: data.message || 'Failed to initiate GitHub Device Flow',
            details: data,
          },
        };
      }

      const parsed = GitHubDeviceCodeResponseSchema.parse(data);
      return { success: true, data: parsed };
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: err instanceof Error ? err.message : 'Network error starting device flow',
        },
      };
    }
  }

  /**
   * Polls the device authorization token endpoint.
   */
  async pollDeviceToken(
    deviceCode: string,
    clientId?: string,
  ): Promise<StorageResult<GitHubTokenResponse>> {
    try {
      const res = await fetch('/api/v1/auth/github/device/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceCode, clientId }),
      });

      const data = await res.json();
      const parsed = GitHubTokenResponseSchema.parse(data);
      return { success: true, data: parsed };
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: err instanceof Error ? err.message : 'Error polling GitHub token',
        },
      };
    }
  }

  /**
   * Helper to perform authenticated GitHub REST requests with exponential backoff and jitter.
   */
  async request<T>(
    endpoint: string,
    token: string,
    options: RequestInit = {},
    maxRetries = 3,
  ): Promise<StorageResult<T>> {
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const url = endpoint.startsWith('http') ? endpoint : `${GITHUB_API_BASE}${endpoint}`;
        const res = await fetch(url, {
          ...options,
          headers: {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28',
            ...(options.headers || {}),
          },
        });

        const remaining = res.headers.get('x-ratelimit-remaining');
        const resetHeader = res.headers.get('x-ratelimit-reset');

        // Handle Rate Limiting (HTTP 429, or HTTP 403 when remaining === '0')
        if (res.status === 429 || (res.status === 403 && remaining === '0')) {
          if (attempt < maxRetries) {
            attempt += 1;
            // Exponential backoff with random jitter (e.g. 500ms * 2^attempt + jitter)
            const jitterMs = Math.floor(Math.random() * 250);
            const backoffMs = Math.min(500 * Math.pow(2, attempt) + jitterMs, 5000);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            continue;
          }

          return {
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: 'GitHub API rate limit exceeded after retries',
              details: { resetTime: resetHeader, attempts: attempt },
            },
          };
        }

        if (res.status === 401) {
          return {
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'GitHub token is invalid or expired' },
          };
        }

        if (res.status === 403) {
          return {
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: 'GitHub API rate limit exceeded or insufficient permissions',
              details: { resetTime: resetHeader },
            },
          };
        }

        if (res.status === 404) {
          return {
            success: false,
            error: { code: 'NOT_FOUND', message: 'Requested repository or resource was not found' },
          };
        }

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          return {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: errJson.message || `GitHub API error: HTTP ${res.status}`,
              details: errJson,
            },
          };
        }

        const data = (await res.json()) as T;
        return { success: true, data };
      } catch (err: unknown) {
        if (attempt < maxRetries) {
          attempt += 1;
          const jitterMs = Math.floor(Math.random() * 200);
          await new Promise((resolve) => setTimeout(resolve, 300 * Math.pow(2, attempt) + jitterMs));
          continue;
        }

        return {
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: err instanceof Error ? err.message : 'Network error reaching GitHub API',
          },
        };
      }
    }

    return {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Max retries exceeded' },
    };
  }

  /**
   * Validates access token and returns authenticated user profile.
   */
  async getUserProfile(token: string): Promise<StorageResult<GitHubUserProfile>> {
    const res = await this.request<{ login: string; name: string | null; avatar_url: string }>(
      '/user',
      token,
    );
    if (!res.success) return res;
    return {
      success: true,
      data: {
        login: res.data.login,
        name: res.data.name,
        avatarUrl: res.data.avatar_url,
      },
    };
  }

  /**
   * Lists repositories accessible to the authenticated user.
   */
  async listRepositories(token: string): Promise<StorageResult<readonly GitHubRepoSummary[]>> {
    const res = await this.request<
      Array<{
        id: number;
        name: string;
        full_name: string;
        default_branch: string;
        private: boolean;
        html_url: string;
      }>
    >('/user/repos?sort=updated&per_page=100', token);

    if (!res.success) return res;

    const list: GitHubRepoSummary[] = res.data.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      defaultBranch: r.default_branch || 'main',
      isPrivate: r.private,
      htmlUrl: r.html_url,
    }));

    return { success: true, data: list };
  }

  /**
   * Creates a new GitHub repository for the authenticated user.
   */
  async createRepository(
    name: string,
    isPrivate: boolean,
    token: string,
  ): Promise<StorageResult<GitHubRepoSummary>> {
    const res = await this.request<{
      id: number;
      name: string;
      full_name: string;
      default_branch: string;
      private: boolean;
      html_url: string;
    }>('/user/repos', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        private: isPrivate,
        auto_init: true,
      }),
    });

    if (!res.success) return res;
    return {
      success: true,
      data: {
        id: res.data.id,
        name: res.data.name,
        fullName: res.data.full_name,
        defaultBranch: res.data.default_branch || 'main',
        isPrivate: res.data.private,
        htmlUrl: res.data.html_url,
      },
    };
  }

  /**
   * Lists branch names for a repository.
   */
  async listBranches(
    owner: string,
    repo: string,
    token: string,
  ): Promise<StorageResult<readonly string[]>> {
    const res = await this.request<Array<{ name: string }>>(
      `/repos/${owner}/${repo}/branches?per_page=100`,
      token,
    );
    if (!res.success) return res;
    return { success: true, data: res.data.map((b) => b.name) };
  }

  /**
   * Pulls project files from a GitHub repository using Git Trees and Blobs API.
   */
  async pullProject(
    owner: string,
    repo: string,
    branch: string,
    token: string,
  ): Promise<StorageResult<Project>> {
    // 1. Fetch recursive tree
    const treeRes = await this.request<{
      sha: string;
      tree: Array<{ path: string; mode: string; type: string; sha: string; size?: number }>;
      truncated: boolean;
    }>(`/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, token);

    if (!treeRes.success) return treeRes;

    const filesToFetch = treeRes.data.tree.filter(
      (item) => item.type === 'blob' && !ZIP_EXPORT_EXCLUSIONS.some((exc) => item.path.includes(exc)),
    );

    const projectFiles: ProjectFile[] = [];
    let hasLean = false;
    let hasPy = false;

    // Fetch blobs in batches to respect rate limits and speed up loading
    const batchSize = 10;
    for (let i = 0; i < filesToFetch.length; i += batchSize) {
      const batch = filesToFetch.slice(i, i + batchSize);
      const batchPromises = batch.map(async (item) => {
        const blobRes = await this.request<{ content: string; encoding: string }>(
          `/repos/${owner}/${repo}/git/blobs/${item.sha}`,
          token,
        );
        if (!blobRes.success) return null;

        let content = '';
        if (blobRes.data.encoding === 'base64') {
          try {
            content = decodeURIComponent(
              atob(blobRes.data.content.replace(/\s/g, ''))
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join(''),
            );
          } catch {
            content = atob(blobRes.data.content.replace(/\s/g, ''));
          }
        } else {
          content = blobRes.data.content;
        }

        const lang = item.path.endsWith('.py')
          ? 'python'
          : item.path.endsWith('.lean')
            ? 'lean4'
            : item.path.endsWith('.md')
              ? 'markdown'
              : item.path.endsWith('.json')
                ? 'json'
                : item.path.endsWith('.toml')
                  ? 'toml'
                  : 'text';

        return {
          path: item.path,
          content,
          language: lang,
          isDirty: false,
        } as ProjectFile;
      });

      const fetchedBatch = await Promise.all(batchPromises);
      for (const f of fetchedBatch) {
        if (f) {
          projectFiles.push(f);
          if (f.language === 'lean4' || f.path === 'lakefile.lean') hasLean = true;
          if (f.language === 'python') hasPy = true;
        }
      }
    }

    const project: Project = {
      id: crypto.randomUUID(),
      name: repo,
      type: hasLean && hasPy ? 'mixed' : hasLean ? 'lean4' : 'python',
      files: projectFiles,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return { success: true, data: project };
  }

  /**
   * Executes an ATOMIC Git Commit across all project files:
   * 1. Get HEAD commit SHA
   * 2. Get base tree SHA
   * 3. Create Blobs for files
   * 4. Create Tree with base tree and blob array
   * 5. Create Commit with parent HEAD
   * 6. Update branch Ref
   */
  async commitAndPush(
    owner: string,
    repo: string,
    branch: string,
    payload: GitHubCommitPayload,
    token: string,
  ): Promise<StorageResult<GitHubCommitResult>> {
    try {
      // 1. Get HEAD commit of branch
      const refRes = await this.request<{ object: { sha: string } }>(
        `/repos/${owner}/${repo}/git/ref/heads/${branch}`,
        token,
      );

      let headCommitSha: string | null = null;
      let baseTreeSha: string | null = null;

      if (refRes.success) {
        headCommitSha = refRes.data.object.sha;
        // 2. Get base tree
        const commitRes = await this.request<{ tree: { sha: string } }>(
          `/repos/${owner}/${repo}/git/commits/${headCommitSha}`,
          token,
        );
        if (commitRes.success) {
          baseTreeSha = commitRes.data.tree.sha;
        }
      }

      // Filter files
      const eligibleFiles = payload.files.filter(
        (f) => !ZIP_EXPORT_EXCLUSIONS.some((exc) => f.path.includes(exc)),
      );

      // 3. Create Blobs concurrently
      const blobPromises = eligibleFiles.map(async (file) => {
        const createBlobRes = await this.request<{ sha: string }>(
          `/repos/${owner}/${repo}/git/blobs`,
          token,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: file.content,
              encoding: 'utf-8',
            }),
          },
        );

        if (!createBlobRes.success) {
          throw new Error(`Failed to create blob for ${file.path}: ${createBlobRes.error.message}`);
        }

        return {
          path: file.path.replace(/\\/g, '/').replace(/^\/+/, ''),
          mode: '100644',
          type: 'blob' as const,
          sha: createBlobRes.data.sha,
        };
      });

      const treeEntries = await Promise.all(blobPromises);

      // 4. Create new Tree
      const treeBody: Record<string, unknown> = { tree: treeEntries };
      if (baseTreeSha) {
        treeBody.base_tree = baseTreeSha;
      }

      const createTreeRes = await this.request<{ sha: string }>(
        `/repos/${owner}/${repo}/git/trees`,
        token,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(treeBody),
        },
      );

      if (!createTreeRes.success) return createTreeRes;
      const newTreeSha = createTreeRes.data.sha;

      // 5. Create new Commit
      const commitBody: Record<string, unknown> = {
        message: payload.message || `Update ${eligibleFiles.length} files from Polyglot Code Studio`,
        tree: newTreeSha,
        parents: headCommitSha ? [headCommitSha] : [],
      };

      const createCommitRes = await this.request<{ sha: string; html_url?: string }>(
        `/repos/${owner}/${repo}/git/commits`,
        token,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(commitBody),
        },
      );

      if (!createCommitRes.success) return createCommitRes;
      const newCommitSha = createCommitRes.data.sha;

      // 6. Update or Create Ref
      if (headCommitSha) {
        const updateRefRes = await this.request<{ object: { sha: string } }>(
          `/repos/${owner}/${repo}/git/refs/heads/${branch}`,
          token,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sha: newCommitSha, force: false }),
          },
        );
        if (!updateRefRes.success) return updateRefRes;
      } else {
        const createRefRes = await this.request<{ object: { sha: string } }>(
          `/repos/${owner}/${repo}/git/refs`,
          token,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: newCommitSha }),
          },
        );
        if (!createRefRes.success) return createRefRes;
      }

      return {
        success: true,
        data: {
          commitSha: newCommitSha,
          commitUrl: `https://github.com/${owner}/${repo}/commit/${newCommitSha}`,
          branch,
          filesCommitted: eligibleFiles.length,
        },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : 'Error committing to GitHub',
        },
      };
    }
  }

  /**
   * Creates a branch-safe fallback branch (`sync-conflict-${Date.now()}-${randomUUID}`)
   * to resolve divergence without risking overwriting remote changes.
   */
  async createConflictBranch(
    owner: string,
    repo: string,
    baseBranch: string,
    payload: GitHubCommitPayload,
    token: string,
  ): Promise<StorageResult<GitHubCommitResult>> {
    const timestamp = Date.now();
    const randomUUID =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2, 11);
    const safeBranchName = `sync-conflict-${timestamp}-${randomUUID}`;
    return this.commitAndPush(owner, repo, safeBranchName, payload, token);
  }

  /**
   * Compares local files against remote repo tree.
   * Transitions to 'conflict' if remote tree SHA-256 differs from expected baseline.
   */
  async checkSyncStatus(
    project: Project,
    owner: string,
    repo: string,
    branch: string,
    token: string,
    lastKnownRemoteSha?: string,
  ): Promise<SyncStatusResult> {
    const treeRes = await this.request<{
      sha: string;
      tree: Array<{ path: string; sha: string; type: string }>;
    }>(`/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, token);

    if (!treeRes.success) {
      return {
        status: 'error',
        diffs: [],
        message: `Could not verify remote repository branch ${branch}`,
      };
    }

    // Detect if remote tree changed unexpectedly compared to last known baseline
    if (lastKnownRemoteSha && treeRes.data.sha !== lastKnownRemoteSha) {
      return {
        status: 'conflict',
        diffs: [],
        message: `Conflitto rilevato: il branch remoto "${branch}" è stato modificato (SHA remoto: ${treeRes.data.sha.slice(0, 7)}, atteso: ${lastKnownRemoteSha.slice(0, 7)}). Utilizzare sync-conflict-\${Date.now()}-\${randomUUID} per evitare sovrascritture.`,
      };
    }

    const remoteTreeMap = new Map<string, string>();
    for (const item of treeRes.data.tree) {
      if (item.type === 'blob') {
        remoteTreeMap.set(item.path, item.sha);
      }
    }

    const diffs: FileDiffSummary[] = [];
    let hasChanges = false;

    for (const file of project.files) {
      const localHash = await computeSha256(file.content);
      const remoteSha = remoteTreeMap.get(file.path);

      if (!remoteSha) {
        diffs.push({
          path: file.path,
          status: 'added',
          localHash,
        });
        hasChanges = true;
      } else {
        diffs.push({
          path: file.path,
          status: 'unchanged',
          localHash,
          remoteHash: remoteSha,
        });
      }
    }

    return {
      status: hasChanges ? 'uncommitted' : 'synced',
      diffs,
      message: hasChanges ? 'Changes pending push to GitHub' : 'In sync with GitHub remote',
    };
  }
}

export const githubProvider = new GitHubProvider();
