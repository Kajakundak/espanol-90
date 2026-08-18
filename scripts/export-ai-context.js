const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const mode = (process.argv[2] || 'all').toLowerCase();
const outputFileName = mode === 'ui' ? 'ai-context-ui.json' : 'ai-context.json';
const outputPath = path.join(rootDir, outputFileName);

const EXCLUDED_DIRS = new Set(['.git', '.next', 'node_modules', 'dist', 'build', 'coverage', '.vercel']);
const IMPORTANT_PATHS = [
  /^src\/app\//,
  /^src\/components\//,
  /^src\/hooks\//,
  /^src\/lib\/context\//,
  /^src\/lib\/ai\//,
  /^src\/lib\/audio\//,
  /^src\/lib\/data\//,
  /^src\/lib\/translations\.ts$/,
  /^src\/lib\/types\//,
  /^src\/lib\/firebase\//,
  /^src\/lib\/.*\.ts$/,
  /^scripts\//,
  /^package\.json$/,
  /^README\.md$/,
  /^AGENTS\.md$/,
  /^plan\.md$/,
  /^Implementation plan\.md$/,
];

function normalizeRel(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

function isAllImportant(relPath) {
  return IMPORTANT_PATHS.some((pattern) => pattern.test(relPath));
}

function isUiImportant(relPath) {
  return relPath.startsWith('src/app/') || relPath.startsWith('src/components/');
}

function isImportant(relPath) {
  if (mode === 'ui') return isUiImportant(relPath);
  return isAllImportant(relPath);
}

function listFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      listFiles(path.join(dir, entry.name), files);
      continue;
    }

    if (!entry.isFile()) continue;

    const fullPath = path.join(dir, entry.name);
    const rel = normalizeRel(fullPath);
    const ext = path.extname(entry.name);

    if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx' || ext === '.json' || ext === '.md') {
      if (isImportant(rel) || rel === 'package.json' || rel.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function classifyFile(relPath) {
  if (relPath.startsWith('src/app/api/')) return 'api-route';
  if (relPath.startsWith('src/app/') && /\/page\.(ts|tsx|js|jsx)$/.test(relPath)) return 'page';
  if (relPath.startsWith('src/app/')) return 'app-file';
  if (/Modal\.(ts|tsx|js|jsx)$/.test(relPath) || relPath.includes('Modal')) return 'modal';
  if (relPath.startsWith('src/components/')) return 'component';
  if (relPath.startsWith('src/lib/context/')) return 'context';
  if (relPath.startsWith('src/lib/ai/')) return 'ai';
  if (relPath.startsWith('src/lib/data/')) return 'data';
  if (relPath.startsWith('src/lib/audio/')) return 'audio';
  if (relPath.startsWith('src/hooks/')) return 'hook';
  if (relPath.startsWith('src/lib/')) return 'library';
  if (relPath.startsWith('scripts/')) return 'script';
  if (relPath.endsWith('.md')) return 'doc';
  return 'misc';
}

function extractRoute(relPath) {
  if (!relPath.startsWith('src/app/')) return null;
  const route = relPath
    .replace(/^src\/app\//, '')
    .replace(/\/page\.(ts|tsx|js|jsx)$/, '')
    .replace(/\.(ts|tsx|js|jsx)$/, '')
    .replace(/^index$/, '');

  const normalized = `/${route}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  return normalized === '' ? '/' : normalized;
}

function buildImportantMetadata(filePath) {
  const relPath = normalizeRel(filePath);
  const content = fs.readFileSync(filePath, 'utf8');

  return {
    path: relPath,
    kind: classifyFile(relPath),
    route: extractRoute(relPath),
    sizeBytes: Buffer.byteLength(content),
    content,
  };
}

function buildSnapshot() {
  const importantFiles = listFiles(rootDir)
    .filter((filePath) => isImportant(normalizeRel(filePath)))
    .sort((a, b) => normalizeRel(a).localeCompare(normalizeRel(b)))
    .map(buildImportantMetadata);

  const counts = importantFiles.reduce((acc, file) => {
    acc[file.kind] = (acc[file.kind] || 0) + 1;
    return acc;
  }, {});

  return {
    project: {
      name: path.basename(rootDir),
      generatedAt: new Date().toISOString(),
      totalImportantFiles: importantFiles.length,
      mode,
      description:
        mode === 'ui'
          ? 'Exact source snapshot of app pages, components, and modals only for UI-focused AI guidance.'
          : 'Exact source snapshot of important project files for AI-based architectural understanding and change suggestions.',
      note: 'This JSON stores the exact original file contents as text and should be used as an input context for an AI assistant.',
    },
    importantFiles,
    counts,
  };
}

function main() {
  const snapshot = buildSnapshot();
  fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2), 'utf8');
  console.log(`✅ Exported ${mode === 'ui' ? 'UI-only' : 'full'} project snapshot to ${path.relative(rootDir, outputPath)}`);
  console.log(`📦 Included ${snapshot.project.totalImportantFiles} important files.`);
}

main();
