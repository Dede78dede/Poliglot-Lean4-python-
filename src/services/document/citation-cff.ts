export interface CitationAuthor {
  readonly 'family-names': string;
  readonly 'given-names': string;
  readonly email?: string;
  readonly orcid?: string;
  readonly affiliation?: string;
}

export interface CitationCffData {
  readonly 'cff-version': '1.2.0';
  readonly message: string;
  readonly title: string;
  readonly version: string;
  readonly 'date-released': string;
  readonly authors: readonly CitationAuthor[];
  readonly url?: string;
  readonly 'repository-code'?: string;
  readonly license: string;
  readonly keywords?: readonly string[];
  readonly abstract?: string;
}

export class CitationCffService {
  public generateCff(options: {
    title: string;
    version: string;
    authors: readonly { givenNames: string; familyNames: string; email?: string; orcid?: string; affiliation?: string }[];
    license: string;
    url?: string;
    repositoryCode?: string;
    dateReleased?: string;
    abstract?: string;
    keywords?: readonly string[];
  }): CitationCffData {
    return {
      'cff-version': '1.2.0',
      message: 'If you use this software in your research or formal proofs, please cite it as below.',
      title: options.title,
      version: options.version,
      'date-released': options.dateReleased ?? new Date().toISOString().split('T')[0],
      authors: options.authors.map((a) => ({
        'family-names': a.familyNames,
        'given-names': a.givenNames,
        ...(a.email ? { email: a.email } : {}),
        ...(a.orcid ? { orcid: a.orcid } : {}),
        ...(a.affiliation ? { affiliation: a.affiliation } : {}),
      })),
      license: options.license,
      url: options.url ?? 'https://polyglot-studio.dev',
      'repository-code': options.repositoryCode ?? 'https://github.com/polyglot-studio/polyglot-code-studio',
      keywords: options.keywords ?? ['formal-verification', 'lean4', 'python', 'interactive-theorem-proving'],
      abstract: options.abstract ?? 'A dual-runtime code editor and formal verification studio for Python 3.14 and Lean 4.',
    };
  }

  public serializeYaml(cff: CitationCffData): string {
    const lines: string[] = [
      `cff-version: "${cff['cff-version']}"`,
      `message: "${cff.message.replace(/"/g, '\\"')}"`,
      `title: "${cff.title.replace(/"/g, '\\"')}"`,
      `version: "${cff.version}"`,
      `date-released: "${cff['date-released']}"`,
      `license: "${cff.license}"`,
    ];

    if (cff.url) lines.push(`url: "${cff.url}"`);
    if (cff['repository-code']) lines.push(`repository-code: "${cff['repository-code']}"`);
    if (cff.abstract) lines.push(`abstract: "${cff.abstract.replace(/"/g, '\\"')}"`);

    lines.push('authors:');
    for (const a of cff.authors) {
      lines.push(`  - family-names: "${a['family-names']}"`);
      lines.push(`    given-names: "${a['given-names']}"`);
      if (a.email) lines.push(`    email: "${a.email}"`);
      if (a.orcid) lines.push(`    orcid: "${a.orcid}"`);
      if (a.affiliation) lines.push(`    affiliation: "${a.affiliation}"`);
    }

    if (cff.keywords && cff.keywords.length > 0) {
      lines.push('keywords:');
      for (const kw of cff.keywords) {
        lines.push(`  - "${kw}"`);
      }
    }

    return lines.join('\n') + '\n';
  }

  public validateCff(cff: CitationCffData): { readonly valid: boolean; readonly errors: readonly string[] } {
    const errors: string[] = [];
    if (cff['cff-version'] !== '1.2.0') {
      errors.push(`Invalid cff-version: expected "1.2.0", got "${cff['cff-version']}"`);
    }
    if (!cff.message) errors.push("Missing required field 'message'");
    if (!cff.title) errors.push("Missing required field 'title'");
    if (!cff.version) errors.push("Missing required field 'version'");
    if (!cff.authors || !Array.isArray(cff.authors) || cff.authors.length === 0) {
      errors.push("Missing required non-empty 'authors' array");
    } else {
      for (let i = 0; i < cff.authors.length; i++) {
        const a = cff.authors[i];
        if (!a['family-names'] || !a['given-names']) {
          errors.push(`Author at index ${i} missing 'family-names' or 'given-names'`);
        }
      }
    }
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const citationCffService = new CitationCffService();
