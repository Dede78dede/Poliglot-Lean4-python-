/// <reference lib="webworker" />

/**
 * Cross-Artifact Search Background Worker (Phase 13, Sprint 13.6, Task SCH1)
 *
 * Offloads MiniSearch index construction and intensive querying from the UI main thread.
 */

import {
  CrossArtifactSearchEngine,
  type SearchDocument,
  type SearchHit,
  type SearchOptions,
} from '../services/search/cross-artifact-search';

export interface SearchWorkerIndexRequest {
  readonly type: 'INDEX_BATCH';
  readonly documents: readonly SearchDocument[];
}

export interface SearchWorkerQueryRequest {
  readonly type: 'SEARCH';
  readonly query: string;
  readonly options?: SearchOptions;
}

export interface SearchWorkerClearRequest {
  readonly type: 'CLEAR';
}

export type SearchWorkerRequest =
  | SearchWorkerIndexRequest
  | SearchWorkerQueryRequest
  | SearchWorkerClearRequest;

export interface SearchWorkerIndexResponse {
  readonly type: 'INDEXED';
  readonly count: number;
}

export interface SearchWorkerQueryResponse {
  readonly type: 'SEARCH_RESULTS';
  readonly query: string;
  readonly hits: readonly SearchHit[];
  readonly durationMs: number;
}

export type SearchWorkerResponse =
  | SearchWorkerIndexResponse
  | SearchWorkerQueryResponse;

const engine = new CrossArtifactSearchEngine();

if (typeof self !== 'undefined' && 'postMessage' in self) {
  const workerCtx = self as unknown as DedicatedWorkerGlobalScope;
  workerCtx.addEventListener('message', (event: MessageEvent<SearchWorkerRequest>) => {
    const req = event.data;
    if (req.type === 'INDEX_BATCH') {
      engine.indexBatch(req.documents);
      workerCtx.postMessage({
        type: 'INDEXED',
        count: engine.getDocumentCount(),
      } satisfies SearchWorkerIndexResponse);
    } else if (req.type === 'SEARCH') {
      const start = performance.now();
      const hits = engine.search(req.query, req.options);
      const durationMs = performance.now() - start;
      workerCtx.postMessage({
        type: 'SEARCH_RESULTS',
        query: req.query,
        hits,
        durationMs,
      } satisfies SearchWorkerQueryResponse);
    } else if (req.type === 'CLEAR') {
      engine.clear();
    }
  });
}
