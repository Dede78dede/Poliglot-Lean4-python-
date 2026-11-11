import fs from 'node:fs';
import path from 'node:path';
import { exportAllBoundarySchemas } from '../src/services/contracts/json-schema-exporter';

const schemas = exportAllBoundarySchemas();
const outDir = path.resolve('schemas');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const sortedSchemas: Record<string, unknown> = {};
for (const key of Object.keys(schemas).sort()) {
  sortedSchemas[key] = schemas[key];
}

fs.writeFileSync(
  path.join(outDir, 'contracts.json'),
  JSON.stringify(sortedSchemas, null, 2)
);

console.log('Exported Zod boundary schemas to schemas/contracts.json');
