import fs from 'fs';
import path from 'path';

const envReference = /process\.env\.([A-Z][A-Z0-9_]*)|enabled\(\s*'([A-Z][A-Z0-9_]*)'\s*\)/g;
const exampleEntry = /^#?\s*([A-Z][A-Z0-9_]*)=/gm;

export const referencedVariables = (source: string): string[] =>
  [...source.matchAll(envReference)].map((match) => match[1] ?? match[2]);

export const documentedVariables = (example: string): string[] =>
  [...example.matchAll(exampleEntry)].map((match) => match[1]);

export const missingFromExample = (sources: string[], example: string): string[] => {
  const documented = new Set(documentedVariables(example));
  const referenced = new Set(sources.flatMap(referencedVariables));
  return [...referenced].filter((name) => !documented.has(name)).sort();
};

const sourceFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(fullPath);
    return entry.name.endsWith('.ts') ? [fullPath] : [];
  });

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const sources = ['src', 'scripts']
    .flatMap((directory) => sourceFiles(path.join(root, directory)))
    .map((file) => fs.readFileSync(file, 'utf8'));
  const example = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  const missing = missingFromExample(sources, example);
  if (missing.length > 0) {
    process.stderr.write(`Missing from .env.example: ${missing.join(', ')}\n`);
    process.exit(1);
  }
}
