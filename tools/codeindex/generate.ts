import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface FileRecord {
  path: string;
  size: number;
  sha256: string;
  lines: number;
  extension: string;
}

interface SymbolRecord {
  file: string;
  name: string;
  kind: 'function' | 'interface' | 'type' | 'class' | 'const' | 'enum';
  line: number;
}

interface TextRecord {
  file: string;
  line: number;
  content: string;
}

const ROOT_DIR = process.cwd();
const OUTPUT_DIR = path.join(ROOT_DIR, '.codeindex');

const INCLUDED_DIRS = ['src', 'server/src', 'tests', 'schemas', 'docs'];
const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.lean', '.py', '.yml', '.yaml', '.sh']);
const EXCLUDED_PATTERNS = [
  /node_modules/,
  /dist/,
  /\.git/,
  /tokens\.json$/,
  /\.codeindex/,
  /reports\/context/,
  /\.ogrep/
];

function sha256(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function scanDir(dir: string, fileList: string[] = []): string[] {
  const fullPath = path.join(ROOT_DIR, dir);
  if (!fs.existsSync(fullPath)) return fileList;

  const entries = fs.readdirSync(fullPath, { withFileTypes: true });
  for (const entry of entries) {
    const relPath = path.join(dir, entry.name);
    if (EXCLUDED_PATTERNS.some((pat) => pat.test(relPath))) {
      continue;
    }
    if (entry.isDirectory()) {
      scanDir(relPath, fileList);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (ALLOWED_EXTENSIONS.has(ext)) {
        fileList.push(relPath);
      }
    }
  }
  return fileList;
}

function extractSymbols(relPath: string, content: string): SymbolRecord[] {
  const symbols: SymbolRecord[] = [];
  const lines = content.split('\n');

  // Simple, deterministic regex matching for key TS/JS symbols
  const fnRegex = /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/;
  const classRegex = /^\s*(?:export\s+)?class\s+([A-Za-z0-9_]+)/;
  const ifaceRegex = /^\s*(?:export\s+)?interface\s+([A-Za-z0-9_]+)/;
  const typeRegex = /^\s*(?:export\s+)?type\s+([A-Za-z0-9_]+)/;
  const enumRegex = /^\s*(?:export\s+)?enum\s+([A-Za-z0-9_]+)/;
  const constRegex = /^\s*export\s+const\s+([A-Za-z0-9_]+)/;

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    let match = line.match(fnRegex);
    if (match) {
      symbols.push({ file: relPath, name: match[1], kind: 'function', line: lineNum });
      return;
    }
    match = line.match(classRegex);
    if (match) {
      symbols.push({ file: relPath, name: match[1], kind: 'class', line: lineNum });
      return;
    }
    match = line.match(ifaceRegex);
    if (match) {
      symbols.push({ file: relPath, name: match[1], kind: 'interface', line: lineNum });
      return;
    }
    match = line.match(typeRegex);
    if (match) {
      symbols.push({ file: relPath, name: match[1], kind: 'type', line: lineNum });
      return;
    }
    match = line.match(enumRegex);
    if (match) {
      symbols.push({ file: relPath, name: match[1], kind: 'enum', line: lineNum });
      return;
    }
    match = line.match(constRegex);
    if (match) {
      symbols.push({ file: relPath, name: match[1], kind: 'const', line: lineNum });
      return;
    }
  });

  return symbols;
}

export function generateIndex(): { fileCount: number; symbolCount: number; textLineCount: number } {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const allFiles: string[] = [];
  for (const dir of INCLUDED_DIRS) {
    scanDir(dir, allFiles);
  }
  // Sort files deterministically
  allFiles.sort();

  const fileRecords: FileRecord[] = [];
  const symbolRecords: SymbolRecord[] = [];
  const textRecords: TextRecord[] = [];

  for (const relPath of allFiles) {
    const fullPath = path.join(ROOT_DIR, relPath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    const fileRec: FileRecord = {
      path: relPath,
      size: Buffer.byteLength(content, 'utf-8'),
      sha256: sha256(content),
      lines: lines.length,
      extension: path.extname(relPath),
    };
    fileRecords.push(fileRec);

    const symbols = extractSymbols(relPath, content);
    symbolRecords.push(...symbols);

    // Index non-empty lines for text search
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.length > 0 && trimmed.length < 500) {
        textRecords.push({
          file: relPath,
          line: idx + 1,
          content: trimmed,
        });
      }
    });
  }

  // Write deterministic outputs
  const filesJsonl = fileRecords.map((r) => JSON.stringify(r)).join('\n') + '\n';
  const symbolsJsonl = symbolRecords.map((r) => JSON.stringify(r)).join('\n') + '\n';
  const textsJsonl = textRecords.map((r) => JSON.stringify(r)).join('\n') + '\n';

  fs.writeFileSync(path.join(OUTPUT_DIR, 'files.jsonl'), filesJsonl, 'utf-8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'symbols.jsonl'), symbolsJsonl, 'utf-8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'texts.jsonl'), textsJsonl, 'utf-8');

  const metaIndex = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    metrics: {
      fileCount: fileRecords.length,
      symbolCount: symbolRecords.length,
      textLineCount: textRecords.length,
      filesSha256: sha256(filesJsonl),
      symbolsSha256: sha256(symbolsJsonl),
      textsSha256: sha256(textsJsonl),
    },
    includedDirs: INCLUDED_DIRS,
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.json'), JSON.stringify(metaIndex, null, 2) + '\n', 'utf-8');

  return {
    fileCount: fileRecords.length,
    symbolCount: symbolRecords.length,
    textLineCount: textRecords.length,
  };
}

const isDirectRun = !process.env.TEST_MODE && (process.argv[1]?.endsWith('generate.ts') || process.argv[1]?.endsWith('generate.js'));
if (isDirectRun) {
  const result = generateIndex();
  console.log(`[CodeIndex] Generated static code index in .codeindex/`);
  console.log(`  Files: ${result.fileCount}`);
  console.log(`  Symbols: ${result.symbolCount}`);
  console.log(`  Text Lines: ${result.textLineCount}`);
}
