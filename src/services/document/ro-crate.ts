export interface RoCrateEntity {
  readonly '@id': string;
  readonly '@type': string | readonly string[];
  readonly [key: string]: unknown;
}

export interface RoCrateMetadata {
  readonly '@context': 'https://w3id.org/ro/crate/1.3/context';
  readonly '@graph': readonly RoCrateEntity[];
}

export interface ProjectManifestConfig {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly authors: readonly { readonly name: string; readonly orcid?: string; readonly email?: string }[];
  readonly license: string;
  readonly files?: readonly { readonly path: string; readonly encodingFormat: string; readonly description?: string }[];
  readonly leanVersion?: string;
  readonly pythonVersion?: string;
  readonly kernelVerified?: boolean;
}

export class RoCrateService {
  public generateManifest(config: ProjectManifestConfig): RoCrateMetadata {
    const rootId = './';
    const metadataDescriptorId = 'ro-crate-metadata.json';

    const rootEntity: RoCrateEntity = {
      '@id': rootId,
      '@type': 'Dataset',
      name: config.name,
      description: config.description,
      version: config.version,
      datePublished: new Date().toISOString().split('T')[0],
      license: config.license,
      conformsTo: { '@id': 'https://w3id.org/ro/crate/1.3' },
      author: config.authors.map((a, idx) => ({
        '@id': a.orcid ? `https://orcid.org/${a.orcid}` : `#/author-${idx}`,
        '@type': 'Person',
        name: a.name,
        ...(a.email ? { email: a.email } : {}),
      })),
      hasPart: (config.files ?? []).map((f) => ({ '@id': f.path })),
      keywords: ['lean4', 'python3.14', 'formal-verification', 'interactive-theorem-proving'],
      softwareRequirements: [
        { '@type': 'SoftwareApplication', name: 'Lean 4', version: config.leanVersion ?? 'v4.35.0-rc4' },
        { '@type': 'SoftwareApplication', name: 'Pyodide / Python', version: config.pythonVersion ?? '3.14' },
      ],
      ...(config.kernelVerified
        ? {
            formalVerification: {
              status: 'kernel-verified',
              seal: 'SEAL_KERNEL_VERIFIED_TIER5',
              checker: 'Lean 4 Native Kernel',
            },
          }
        : {}),
    };

    const metadataDescriptor: RoCrateEntity = {
      '@id': metadataDescriptorId,
      '@type': 'CreativeWork',
      conformsTo: { '@id': 'https://w3id.org/ro/crate/1.3' },
      about: { '@id': rootId },
    };

    const fileEntities: RoCrateEntity[] = (config.files ?? []).map((f) => ({
      '@id': f.path,
      '@type': 'File',
      encodingFormat: f.encodingFormat,
      description: f.description ?? `Project source file ${f.path}`,
    }));

    return {
      '@context': 'https://w3id.org/ro/crate/1.3/context',
      '@graph': [metadataDescriptor, rootEntity, ...fileEntities],
    };
  }

  public validateManifest(manifest: RoCrateMetadata): { readonly valid: boolean; readonly errors: readonly string[] } {
    const errors: string[] = [];

    if (manifest['@context'] !== 'https://w3id.org/ro/crate/1.3/context') {
      errors.push(`Invalid @context: expected https://w3id.org/ro/crate/1.3/context, got ${manifest['@context']}`);
    }

    if (!Array.isArray(manifest['@graph']) || manifest['@graph'].length < 2) {
      errors.push('Manifest @graph must contain at least the metadata descriptor and root dataset');
      return { valid: false, errors };
    }

    const descriptor = manifest['@graph'].find((e) => e['@id'] === 'ro-crate-metadata.json');
    if (!descriptor) {
      errors.push("Missing required metadata descriptor entity 'ro-crate-metadata.json'");
    }

    const root = manifest['@graph'].find((e) => e['@id'] === './');
    if (!root) {
      errors.push("Missing required root dataset entity './'");
    } else {
      if (!root['name']) errors.push("Root dataset missing 'name'");
      if (!root['datePublished']) errors.push("Root dataset missing 'datePublished'");
      if (!root['license']) errors.push("Root dataset missing 'license'");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const roCrateService = new RoCrateService();
