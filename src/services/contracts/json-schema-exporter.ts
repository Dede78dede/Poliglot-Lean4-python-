/**
 * JSON Schema Exporter (Phase 13, Sprint 13.2, Task CP1 — Hardened in Phase 14.9.9.2, G-H2)
 *
 * Exports Zod v4 schemas to standard JSON Schema (draft-2020-12 / OpenAPI 3.1)
 * with explicit OpenAPI `discriminator: { propertyName }` injection for
 * ZodDiscriminatedUnion.
 */

import { z } from 'zod';
import * as contracts from '../../types/contracts';

export interface ExportOptions {
  readonly target?: 'draft-2020-12' | 'openapi-3.1';
  readonly emitDiscriminators?: boolean; // default true
}

export function convertZodToJsonSchema(schema: any, options: ExportOptions = { emitDiscriminators: true }): Record<string, unknown> {
  if (!schema) return {};
  const def = schema.def ?? schema._def;
  if (!def) return {};

  const type = def.type ?? def.typeName;

  switch (type) {
    case 'string':
    case 'ZodString': {
      const res: Record<string, unknown> = { type: 'string' };
      if (Array.isArray(def.checks)) {
        for (const check of def.checks) {
          if (check.kind === 'min' || check.kind === 'minLength') res.minLength = check.value;
          if (check.kind === 'max' || check.kind === 'maxLength') res.maxLength = check.value;
        }
      }
      return res;
    }
    case 'number':
    case 'ZodNumber': {
      const res: Record<string, unknown> = { type: 'number' };
      if (Array.isArray(def.checks)) {
        for (const check of def.checks) {
          if (check.kind === 'int') res.type = 'integer';
          if (check.kind === 'min') res.minimum = check.value;
          if (check.kind === 'max') res.maximum = check.value;
          if (check.kind === 'nonnegative') res.minimum = 0;
        }
      }
      return res;
    }
    case 'boolean':
    case 'ZodBoolean':
      return { type: 'boolean' };
    case 'literal':
    case 'ZodLiteral': {
      const val = def.values ? def.values[0] : (def.value ?? schema.value);
      return { const: val };
    }
    case 'enum':
    case 'ZodEnum': {
      const values = def.entries ? Object.values(def.entries) : (def.values ?? []);
      return { type: 'string', enum: values };
    }
    case 'array':
    case 'ZodArray': {
      const inner = def.element ?? def.type;
      return { type: 'array', items: convertZodToJsonSchema(inner, options) };
    }
    case 'optional':
    case 'ZodOptional':
      return convertZodToJsonSchema(def.innerType, options);
    case 'default':
    case 'ZodDefault': {
      const inner = convertZodToJsonSchema(def.innerType, options);
      const defVal = typeof def.defaultValue === 'function' ? def.defaultValue() : def.defaultValue;
      return { ...inner, default: defVal };
    }
    case 'object':
    case 'ZodObject': {
      const shape = typeof def.shape === 'function' ? def.shape() : def.shape;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, propSchema] of Object.entries(shape ?? {})) {
        properties[key] = convertZodToJsonSchema(propSchema, options);
        const pDef = (propSchema as any)?.def ?? (propSchema as any)?._def;
        const pType = pDef?.type ?? pDef?.typeName;
        if (pType !== 'optional' && pType !== 'ZodOptional') {
          required.push(key);
        }
      }

      const res: Record<string, unknown> = {
        type: 'object',
        properties,
        additionalProperties: false,
      };
      if (required.length > 0) {
        res.required = required;
      }
      return res;
    }
    case 'discriminatedUnion':
    case 'ZodDiscriminatedUnion':
    case 'union':
    case 'ZodUnion': {
      const optList = def.options ?? (def.optionsMap ? Array.from(def.optionsMap.values()) : []);
      const optionsRes = optList.map((opt: any) => convertZodToJsonSchema(opt, options));
      if (def.discriminator) {
        const res: Record<string, unknown> = { oneOf: optionsRes };
        if (options.emitDiscriminators !== false) {
          res.discriminator = { propertyName: def.discriminator };
        }
        return res;
      }
      return { anyOf: optionsRes };
    }
    case 'record':
    case 'any':
    case 'ZodRecord':
    case 'ZodAny':
      return { type: 'object' };
    default:
      return { type: 'object' };
  }
}

export function exportJsonSchema<T extends z.ZodTypeAny>(
  schema: T,
  options: ExportOptions = { target: 'draft-2020-12', emitDiscriminators: true }
): Record<string, unknown> {
  return convertZodToJsonSchema(schema, options);
}

/**
 * Returns a catalog of all exported boundary schemas for Pydantic v2 sync.
 */
export function exportAllBoundarySchemas(): Record<string, Record<string, unknown>> {
  return {
    LeanExecuteRequest: exportJsonSchema(contracts.LeanExecuteRequestSchema),
    LeanExecuteResponse: exportJsonSchema(contracts.LeanExecuteResponseSchema),
    ProblemDetails: exportJsonSchema(contracts.ProblemDetailsSchema),
    HealthCheckResponse: exportJsonSchema(contracts.HealthCheckResponseSchema),
    SerializedBridgeError: exportJsonSchema(contracts.SerializedBridgeErrorSchema),
    ProofReuseQuery: exportJsonSchema(contracts.ProofReuseQuerySchema),
    ProofReuseResult: exportJsonSchema(contracts.ProofReuseResultSchema),
    ProposalLoopResult: exportJsonSchema(contracts.ProposalLoopResultSchema),
    FidelityCheckRequest: exportJsonSchema(contracts.FidelityCheckRequestSchema),
    FidelityCheckResult: exportJsonSchema(contracts.FidelityCheckResultSchema),
    ConfigProposal: exportJsonSchema(contracts.ConfigProposalSchema),
  };
}
