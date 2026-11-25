/**
 * OpenAPI 3.1.0 Generator (Single Canonical Source: src/contracts/index.ts Zod Schemas)
 *
 * Generates deterministic schemas/openapi.json directly from canonical Zod boundary contracts
 * and HTTP route security/problem definitions (RFC 9457).
 */

import fs from 'node:fs';
import path from 'node:path';
import * as contracts from '../src/contracts';
import { exportJsonSchema } from '../src/services/contracts/json-schema-exporter';

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortDeep);
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      out[key] = sortDeep(record[key]);
    }
    return out;
  }
  return value;
}

export function generateOpenApiSpec(): Record<string, unknown> {
  const componentSchemas: Record<string, unknown> = {
    ConsensusAdjudicationResult: exportJsonSchema(contracts.ConsensusAdjudicationResultSchema, {
      target: 'openapi-3.1',
      emitDiscriminators: true,
    }),
    ConsensusEnvironment: exportJsonSchema(contracts.ConsensusEnvironmentSchema, {
      target: 'openapi-3.1',
      emitDiscriminators: true,
    }),
    ConsensusProjectFile: exportJsonSchema(contracts.ConsensusProjectFileSchema, {
      target: 'openapi-3.1',
      emitDiscriminators: true,
    }),
    ConsensusRequest: exportJsonSchema(contracts.ConsensusRequestSchema, {
      target: 'openapi-3.1',
      emitDiscriminators: true,
    }),
    HealthCheckResponse: exportJsonSchema(contracts.HealthCheckResponseSchema, {
      target: 'openapi-3.1',
      emitDiscriminators: true,
    }),
    LeanExecuteRequest: exportJsonSchema(contracts.LeanExecuteRequestSchema, {
      target: 'openapi-3.1',
      emitDiscriminators: true,
    }),
    LeanExecuteResponse: exportJsonSchema(contracts.LeanExecuteResponseSchema, {
      target: 'openapi-3.1',
      emitDiscriminators: true,
    }),
    Lp2TranslationRequest: exportJsonSchema(contracts.Lp2TranslationRequestSchema, {
      target: 'openapi-3.1',
      emitDiscriminators: true,
    }),
    ProblemDetails: exportJsonSchema(contracts.ProblemDetailsSchema, {
      target: 'openapi-3.1',
      emitDiscriminators: true,
    }),
    ProofOutcome: exportJsonSchema(contracts.ProofOutcomeSchema, {
      target: 'openapi-3.1',
      emitDiscriminators: true,
    }),
    ProofReuseQuery: exportJsonSchema(contracts.ProofReuseQuerySchema, {
      target: 'openapi-3.1',
      emitDiscriminators: true,
    }),
    ProofReuseResult: exportJsonSchema(contracts.ProofReuseResultSchema, {
      target: 'openapi-3.1',
      emitDiscriminators: true,
    }),
    ServerHealthzResponse: exportJsonSchema(contracts.ServerHealthzResponseSchema, {
      target: 'openapi-3.1',
      emitDiscriminators: true,
    }),
    ServerReadyzResponse: exportJsonSchema(contracts.ServerReadyzResponseSchema, {
      target: 'openapi-3.1',
      emitDiscriminators: true,
    }),
    SpeculativeProbeRequest: exportJsonSchema(contracts.SpeculativeProbeRequestSchema, {
      target: 'openapi-3.1',
      emitDiscriminators: true,
    }),
    TelemetrySpanPayload: exportJsonSchema(contracts.TelemetrySpanPayloadSchema, {
      target: 'openapi-3.1',
      emitDiscriminators: true,
    }),
  };

  const problemResponse = (description: string) => ({
    description,
    content: {
      'application/problem+json': {
        schema: { $ref: '#/components/schemas/ProblemDetails' },
      },
    },
  });

  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'Polyglot Code Studio API',
      version: '2.3.0-rc',
      description:
        'Canonical REST contracts generated directly from Zod schemas in src/contracts/index.ts with RFC 9457 Problem Details error envelopes.',
    },
    servers: [{ url: 'http://127.0.0.1:3000' }],
    paths: {
      '/healthz': {
        get: {
          summary: 'Liveness probe',
          responses: {
            '200': {
              description: 'Process alive',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ServerHealthzResponse' },
                },
              },
            },
          },
        },
      },
      '/readyz': {
        get: {
          summary: 'Readiness probe for Kimina and isolated Lake runner',
          responses: {
            '200': {
              description: 'Kernel backends ready',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ServerReadyzResponse' },
                },
              },
            },
            '503': {
              description: 'Backend kernel service unreachable or not ready',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ServerReadyzResponse' },
                },
              },
            },
          },
        },
      },
      '/api/v1/lean/execute': {
        post: {
          summary: 'Execute Lean 4 snippet via Kimina proxy',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LeanExecuteRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Lean snippet execution result',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/LeanExecuteResponse' },
                },
              },
            },
            '400': problemResponse('Validation error'),
            '401': problemResponse('Unauthorized access'),
            '408': problemResponse('Lean execution timeout'),
            '502': problemResponse('Kimina upstream unavailable'),
          },
        },
      },
      '/api/v1/lean/consensus': {
        post: {
          summary: 'Run dual-engine Kimina + Lake consensus verification (server provenance locked)',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ConsensusRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Binding hybrid consensus adjudication result',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ConsensusAdjudicationResult' },
                },
              },
            },
            '400': problemResponse('Validation error, digest mismatch, or forged evidence rejected'),
            '401': problemResponse('Unauthorized access'),
          },
        },
      },
      '/api/v1/telemetry/spans': {
        post: {
          summary: 'Ingest redacted client telemetry span (gated by ENABLE_OTEL_NODE)',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TelemetrySpanPayload' },
              },
            },
          },
          responses: {
            '201': { description: 'Span recorded' },
            '400': problemResponse('Invalid telemetry payload'),
            '401': problemResponse('Unauthorized access'),
            '503': problemResponse('Telemetry disabled by feature flag'),
          },
        },
      },
      '/api/v1/proof/speculative': {
        post: {
          summary: 'Non-certifying speculative tactic beam probe via lean-beam',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SpeculativeProbeRequest' },
              },
            },
          },
          responses: {
            '200': { description: 'Speculative probe result (non-certifying)' },
            '400': problemResponse('Invalid speculative request'),
            '401': problemResponse('Unauthorized access'),
            '422': problemResponse('Toolchain mismatch'),
            '503': problemResponse('Feature disabled or lean-beam server unavailable'),
          },
        },
      },
      '/api/v1/translation/lp2': {
        post: {
          summary: 'Bidirectional LP2 Python/Lean translation (non-certifying)',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Lp2TranslationRequest' },
              },
            },
          },
          responses: {
            '200': { description: 'Translated source' },
            '400': problemResponse('Invalid translation request'),
            '401': problemResponse('Unauthorized access'),
            '503': problemResponse('Feature disabled or LP2 backend unavailable'),
          },
        },
      },
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
      },
      schemas: componentSchemas,
    },
  };

  return sortDeep(spec) as Record<string, unknown>;
}

export function writeOpenApiSpec(targetPath = 'schemas/openapi.json'): void {
  const spec = generateOpenApiSpec();
  const fullPath = path.resolve(targetPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(spec, null, 2)}\n`, 'utf-8');
  console.log(`Generated OpenAPI 3.1.0 specification written to ${targetPath}`);
}

if (process.argv[1]?.endsWith('generate-openapi.ts')) {
  writeOpenApiSpec();
}
