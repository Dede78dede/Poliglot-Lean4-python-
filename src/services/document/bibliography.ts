export interface CslAuthor {
  readonly family?: string;
  readonly given?: string;
  readonly literal?: string;
}

export interface CslDate {
  readonly 'date-parts': readonly (readonly [number, number?, number?])[];
}

export interface CslItem {
  readonly id: string;
  readonly type: 'article-journal' | 'book' | 'chapter' | 'paper-conference' | 'thesis' | 'software' | 'webpage';
  readonly title: string;
  readonly author?: readonly CslAuthor[];
  readonly issued?: CslDate;
  readonly 'container-title'?: string;
  readonly volume?: string | number;
  readonly issue?: string | number;
  readonly page?: string;
  readonly DOI?: string;
  readonly URL?: string;
  readonly publisher?: string;
  readonly version?: string;
}

export type CitationStyle = 'ieee' | 'apa' | 'nature' | 'ams';

export class BibliographyService {
  private readonly items = new Map<string, CslItem>();

  constructor(initialItems?: readonly CslItem[]) {
    if (initialItems) {
      for (const item of initialItems) {
        this.items.set(item.id, item);
      }
    } else {
      // Seed with seminal verification and Lean papers
      this.addItem({
        id: 'moura2021lean4',
        type: 'paper-conference',
        title: 'The Lean 4 Theorem Prover and Programming Language',
        author: [
          { family: 'de Moura', given: 'Leonardo' },
          { family: 'Ullrich', given: 'Sebastian' },
        ],
        issued: { 'date-parts': [[2021]] },
        'container-title': 'Automated Deduction – CADE 28',
        page: '625-635',
        DOI: '10.1007/978-3-030-79876-5_37',
      });
      this.addItem({
        id: 'mathlib2020',
        type: 'paper-conference',
        title: 'The Lean Mathematical Library',
        author: [
          { literal: 'The mathlib Community' },
        ],
        issued: { 'date-parts': [[2020]] },
        'container-title': 'Proceedings of the 9th ACM SIGPLAN International Conference on Certified Programs and Proofs (CPP 2020)',
        page: '367-381',
        DOI: '10.1145/3372885.3373824',
      });
    }
  }

  public addItem(item: CslItem): void {
    this.items.set(item.id, item);
  }

  public getItem(id: string): CslItem | undefined {
    return this.items.get(id);
  }

  public listItems(): readonly CslItem[] {
    return Array.from(this.items.values());
  }

  public parseBibtex(bibtex: string): readonly CslItem[] {
    const entries: CslItem[] = [];
    const entryRegex = /@(\w+)\s*\{\s*([^,]+),([^@]*)\}/g;
    let match: RegExpExecArray | null = entryRegex.exec(bibtex);

    while (match) {
      const typeStr = match[1].toLowerCase();
      const id = match[2].trim();
      const body = match[3];

      const getField = (field: string): string | undefined => {
        const fieldRegex = new RegExp(`${field}\\s*=\\s*[{"]([^}"]+)[}"]`, 'i');
        const m = fieldRegex.exec(body);
        return m ? m[1].trim() : undefined;
      };

      const title = getField('title') ?? 'Untitled';
      const authorStr = getField('author');
      const yearStr = getField('year');
      const journalStr = getField('journal') ?? getField('booktitle');
      const doi = getField('doi');
      const url = getField('url');

      const authors: CslAuthor[] = authorStr
        ? authorStr.split(/\s+and\s+/i).map((part) => {
            const trimmed = part.trim();
            if (trimmed.includes(',')) {
              const [fam, giv] = trimmed.split(',').map((s) => s.trim());
              return { family: fam, given: giv };
            }
            const tokens = trimmed.split(/\s+/);
            const fam = tokens.pop() ?? '';
            return { family: fam, given: tokens.join(' ') };
          })
        : [];

      let type: CslItem['type'] = 'article-journal';
      if (typeStr === 'book') type = 'book';
      else if (typeStr === 'inproceedings' || typeStr === 'conference') type = 'paper-conference';
      else if (typeStr === 'incollection') type = 'chapter';
      else if (typeStr === 'phdthesis' || typeStr === 'mastersthesis') type = 'thesis';
      else if (typeStr === 'misc' || typeStr === 'software') type = 'software';

      const item: CslItem = {
        id,
        type,
        title,
        ...(authors.length > 0 ? { author: authors } : {}),
        ...(yearStr && !isNaN(Number(yearStr)) ? { issued: { 'date-parts': [[Number(yearStr)]] } } : {}),
        ...(journalStr ? { 'container-title': journalStr } : {}),
        ...(doi ? { DOI: doi } : {}),
        ...(url ? { URL: url } : {}),
      };

      entries.push(item);
      this.addItem(item);
      match = entryRegex.exec(bibtex);
    }

    return entries;
  }

  public formatCitation(item: CslItem, style: CitationStyle = 'ieee'): string {
    const authorsStr = (item.author ?? [])
      .map((a) => (a.literal ? a.literal : a.given ? `${a.given} ${a.family}` : a.family))
      .join(', ');
    const year = item.issued?.['date-parts']?.[0]?.[0] ?? 'n.d.';

    switch (style) {
      case 'ieee':
        return `${authorsStr}, "${item.title}", in ${item['container-title'] ?? 'Proc.'}, ${year}.${item.DOI ? ` DOI: ${item.DOI}` : ''}`;
      case 'apa':
        return `${authorsStr} (${year}). ${item.title}. ${item['container-title'] ?? ''}.${item.DOI ? ` https://doi.org/${item.DOI}` : ''}`;
      case 'nature':
        return `${authorsStr}. ${item.title}. ${item['container-title'] ?? ''} (${year}).`;
      case 'ams':
        return `${authorsStr}, ${item.title}, ${item['container-title'] ?? ''} (${year}).`;
    }
  }

  public exportBibtex(): string {
    return Array.from(this.items.values())
      .map((item) => {
        const authors = (item.author ?? [])
          .map((a) => (a.literal ? a.literal : `${a.family}, ${a.given ?? ''}`))
          .join(' and ');
        const year = item.issued?.['date-parts']?.[0]?.[0] ?? '';
        return `@${item.type === 'paper-conference' ? 'inproceedings' : item.type === 'book' ? 'book' : 'article'}{${item.id},
  title = {${item.title}},
  author = {${authors}},
  year = {${year}}${item['container-title'] ? `,\n  booktitle = {${item['container-title']}}` : ''}${item.DOI ? `,\n  doi = {${item.DOI}}` : ''}
}`;
      })
      .join('\n\n');
  }
}

export const bibliographyService = new BibliographyService();
