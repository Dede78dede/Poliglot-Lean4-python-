/**
 * Unified Cross-Artifact Search Engine (Phase 13, Sprint 13.6, SCH1)
 *
 * Powered by MiniSearch to provide sub-millisecond full-text retrieval across
 * 5 distinct artifact corpora:
 * 1. Project files (Lean 4, Python, Markdown, JSON)
 * 2. Verification evidence & certificates
 * 3. Reusable verified proofs (Tier 5 cache)
 * 4. Chat and assistant dialog history
 * 5. Native Notebooks (.polyglot-notebook, .ipynb)
 */

import MiniSearch from 'minisearch';

export type SearchCorpus = 'files' | 'evidence' | 'proofs' | 'chat' | 'notebooks';

export interface SearchDocument {
  readonly id: string;
  readonly corpus: SearchCorpus;
  readonly title: string;
  readonly content: string;
  readonly path?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface SearchMatchHighlight {
  readonly start: number;
  readonly end: number;
}

export interface SearchHit {
  readonly id: string;
  readonly corpus: SearchCorpus;
  readonly title: string;
  readonly path?: string;
  readonly score: number;
  readonly snippet: string;
  readonly highlights: readonly SearchMatchHighlight[];
  readonly metadata?: Record<string, unknown>;
}

export interface SearchOptions {
  readonly corpora?: readonly SearchCorpus[];
  readonly limit?: number;
  readonly fuzzy?: number;
  readonly prefix?: boolean;
}

export class CrossArtifactSearchEngine {
  private miniSearch: MiniSearch<SearchDocument>;
  private readonly documents = new Map<string, SearchDocument>();

  constructor() {
    this.miniSearch = new MiniSearch<SearchDocument>({
      fields: ['title', 'content', 'path'],
      storeFields: ['id', 'corpus', 'title', 'path', 'metadata'],
      searchOptions: {
        prefix: true,
        fuzzy: 0.2,
        boost: { title: 2.5, path: 1.5 },
      },
    });
  }

  /**
   * Adds or replaces a document in the search index.
   */
  public indexDocument(doc: SearchDocument): void {
    if (this.documents.has(doc.id)) {
      this.miniSearch.discard(doc.id);
    }
    this.documents.set(doc.id, doc);
    this.miniSearch.add(doc);
  }

  /**
   * Batch indexes multiple documents.
   */
  public indexBatch(docs: readonly SearchDocument[]): void {
    for (const doc of docs) {
      if (this.documents.has(doc.id)) {
        this.miniSearch.discard(doc.id);
      }
      this.documents.set(doc.id, doc);
    }
    this.miniSearch.addAll(docs as SearchDocument[]);
  }

  /**
   * Generates contextual snippet and exact match highlights.
   */
  public generateSnippet(
    content: string,
    query: string,
    maxLength = 140
  ): { snippet: string; highlights: SearchMatchHighlight[] } {
    if (!content) return { snippet: '', highlights: [] };

    const lowerContent = content.toLowerCase();
    const queryTokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 1);

    let matchIdx = -1;
    let matchedToken = '';

    for (const token of queryTokens) {
      const idx = lowerContent.indexOf(token);
      if (idx !== -1) {
        matchIdx = idx;
        matchedToken = token;
        break;
      }
    }

    if (matchIdx === -1) {
      const snippet = content.slice(0, maxLength) + (content.length > maxLength ? '...' : '');
      return { snippet, highlights: [] };
    }

    const half = Math.floor(maxLength / 2);
    const start = Math.max(0, matchIdx - half);
    const end = Math.min(content.length, start + maxLength);

    let snippet = content.slice(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    // Calculate relative highlight in snippet
    const snippetMatchIdx = snippet.toLowerCase().indexOf(matchedToken);
    const highlights: SearchMatchHighlight[] = [];
    if (snippetMatchIdx !== -1) {
      highlights.push({
        start: snippetMatchIdx,
        end: snippetMatchIdx + matchedToken.length,
      });
    }

    return { snippet, highlights };
  }

  /**
   * Executes sub-millisecond search across selected corpora.
   */
  public search(query: string, options?: SearchOptions): readonly SearchHit[] {
    const rawResults = this.miniSearch.search(query, {
      prefix: options?.prefix ?? true,
      fuzzy: options?.fuzzy ?? 0.2,
      filter: options?.corpora ? (result) => options.corpora!.includes(result.corpus as SearchCorpus) : undefined,
    });

    const limit = options?.limit ?? 15;
    const hits: SearchHit[] = [];

    for (let i = 0; i < Math.min(rawResults.length, limit); i++) {
      const res = rawResults[i];
      const doc = this.documents.get(res.id);
      const content = doc?.content ?? '';

      const { snippet, highlights } = this.generateSnippet(content, query);

      hits.push({
        id: res.id,
        corpus: res.corpus as SearchCorpus,
        title: res.title,
        path: res.path,
        score: Number(res.score.toFixed(4)),
        snippet,
        highlights,
        metadata: res.metadata as Record<string, unknown> | undefined,
      });
    }

    return Object.freeze(hits);
  }

  /**
   * Exports JSON representation of search index for worker transfer or storage.
   */
  public exportIndex(): string {
    return JSON.stringify({
      index: this.miniSearch.toJSON(),
      docCount: this.documents.size,
    });
  }

  public getDocumentCount(): number {
    return this.documents.size;
  }

  public clear(): void {
    this.miniSearch.removeAll();
    this.documents.clear();
  }
}

export const crossArtifactSearch = new CrossArtifactSearchEngine();
