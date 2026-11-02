import fs from 'node:fs';
import path from 'node:path';
import { exportAllBoundarySchemas } from '../src/services/contracts/json-schema-exporter';

const schemas = exportAllBoundarySchemas();
const outDir = path.resolve('schemas');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(
  path.join(outDir, 'contracts.json'),
  JSON.stringify(schemas, Object.keys(schemas).sort(), 2)
);

console.log('Exported Zod boundary schemas to schemas/contracts.json');
