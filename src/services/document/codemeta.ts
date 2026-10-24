export interface CodeMetaAuthor {
  readonly '@type': 'Person';
  readonly givenName: string;
  readonly familyName: string;
  readonly email?: string;
  readonly '@id'?: string;
  readonly affiliation?: {
    readonly '@type': 'Organization';
    readonly name: string;
  };
}

export interface CodeMetaDocument {
  readonly '@context': 'https://w3id.org/codemeta/v3.0';
  readonly '@type': 'SoftwareSourceCode';
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly applicationCategory: string;
  readonly programmingLanguage: readonly string[];
  readonly codeRepository?: string;
  readonly license: string;
  readonly author: readonly CodeMetaAuthor[];
  readonly dateModified: string;
  readonly referencePublication?: readonly {
    readonly '@type': 'ScholarlyArticle';
    readonly name: string;
    readonly url?: string;
    readonly identifier?: string;
  }[];
  readonly softwareRequirements?: readonly string[];
}

export class CodeMetaService {
  public generateCodeMeta(options: {
    name: string;
    version: string;
    description: string;
    license: string;
    authors: readonly { givenName: string; familyName: string; email?: string; orcid?: string }[];
    repository?: string;
    languages?: readonly string[];
  }): CodeMetaDocument {
    return {
      '@context': 'https://w3id.org/codemeta/v3.0',
      '@type': 'SoftwareSourceCode',
      name: options.name,
      version: options.version,
      description: options.description,
      applicationCategory: 'Formal Verification, Interactive Theorem Proving & Scientific Computing',
      programmingLanguage: options.languages ?? ['Lean 4', 'Python 3.14'],
      codeRepository: options.repository ?? 'https://github.com/polyglot-studio/polyglot-code-studio',
      license: options.license,
      author: options.authors.map((a) => ({
        '@type': 'Person',
        givenName: a.givenName,
        familyName: a.familyName,
        ...(a.email ? { email: a.email } : {}),
        ...(a.orcid ? { '@id': `https://orcid.org/${a.orcid}` } : {}),
      })),
      dateModified: new Date().toISOString().split('T')[0],
      softwareRequirements: [
        'Lean 4 v4.35.0-rc4',
        'Python 3.14 (Pyodide 2026 ABI)',
        'Mathlib 4',
      ],
    };
  }

  public validateCodeMeta(doc: CodeMetaDocument): { readonly valid: boolean; readonly errors: readonly string[] } {
    const errors: string[] = [];
    if (doc['@context'] !== 'https://w3id.org/codemeta/v3.0') {
      errors.push(`Invalid @context: expected https://w3id.org/codemeta/v3.0, got ${doc['@context']}`);
    }
    if (doc['@type'] !== 'SoftwareSourceCode') {
      errors.push(`Invalid @type: expected SoftwareSourceCode, got ${doc['@type']}`);
    }
    if (!doc.name || typeof doc.name !== 'string') errors.push("Missing or invalid 'name'");
    if (!doc.version) errors.push("Missing 'version'");
    if (!doc.license) errors.push("Missing 'license'");
    if (!Array.isArray(doc.programmingLanguage) || doc.programmingLanguage.length === 0) {
      errors.push("Missing or empty 'programmingLanguage'");
    }
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const codeMetaService = new CodeMetaService();
