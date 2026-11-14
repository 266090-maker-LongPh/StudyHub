import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const STORAGE_DIR = path.resolve(__dirname, 'storage');
const PROGRESS_FILE = path.join(STORAGE_DIR, 'progress.json');
const MATERIALS_DIR = path.resolve(__dirname, 'materials');
const MAX_BODY_BYTES = 2 * 1024 * 1024;

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.sql': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function findFileRecursively(dir: string, targetName: string): string | null {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name.toLowerCase() === targetName.toLowerCase()) {
      return full;
    }
    if (entry.isDirectory()) {
      const nested = findFileRecursively(full, targetName);
      if (nested) return nested;
    }
  }
  return null;
}

function resolveMaterialFile(rawUrl: string): string | null {
  const urlPath = rawUrl.split('?')[0].split('#')[0];
  let decoded = '';
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const relSegments = decoded
    .replace(/^\/+/, '')
    .split('/')
    .filter((seg) => seg && seg !== '.' && seg !== '..');
  if (relSegments.length === 0) return null;

  const directPath = path.resolve(MATERIALS_DIR, ...relSegments);
  if (!directPath.startsWith(MATERIALS_DIR + path.sep)) {
    return null;
  }
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return directPath;
  }

  // Fallback: if subject folder is specified (e.g. DBS or SE1-2026), search inside it by filename
  const subjectRoot = path.resolve(MATERIALS_DIR, relSegments[0]);
  if (
    subjectRoot.startsWith(MATERIALS_DIR + path.sep) &&
    fs.existsSync(subjectRoot) &&
    fs.statSync(subjectRoot).isDirectory()
  ) {
    const baseName = relSegments[relSegments.length - 1];
    const found = findFileRecursively(subjectRoot, baseName);
    if (found && found.startsWith(MATERIALS_DIR + path.sep)) {
      return found;
    }
  }
  return null;
}

function readJsonBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

function attachWorkspaceStorageMiddleware(middlewares: Connect.Server) {
  middlewares.use('/api/local-storage', async (req, res, next) => {
    if (req.method === 'GET') {
      try {
        if (!fs.existsSync(PROGRESS_FILE)) {
          sendJson(res, 200, { exists: false, data: null });
          return;
        }
        const raw = fs.readFileSync(PROGRESS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        sendJson(res, 200, { exists: true, data: parsed });
      } catch (err) {
        sendJson(res, 500, {
          error: err instanceof Error ? err.message : 'Read error',
        });
      }
      return;
    }

    if (req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const parsed = JSON.parse(body) as Record<string, unknown>;
        if (
          !parsed ||
          typeof parsed !== 'object' ||
          typeof parsed.dbs !== 'object' ||
          typeof parsed.se1 !== 'object'
        ) {
          sendJson(res, 400, { error: 'Invalid progress payload' });
          return;
        }
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
        fs.writeFileSync(
          PROGRESS_FILE,
          JSON.stringify(parsed, null, 2),
          'utf8',
        );
        sendJson(res, 200, { ok: true, file: 'storage/progress.json' });
      } catch (err) {
        sendJson(res, 400, {
          error: err instanceof Error ? err.message : 'Invalid JSON',
        });
      }
      return;
    }

    next();
  });

  middlewares.use('/materials', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    const targetPath = resolveMaterialFile(req.url ?? '');
    if (!targetPath) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Material file not found');
      return;
    }

    const stat = fs.statSync(targetPath);
    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const range = req.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (match) {
        const start = match[1] ? Number.parseInt(match[1], 10) : 0;
        const end = match[2]
          ? Math.min(Number.parseInt(match[2], 10), stat.size - 1)
          : stat.size - 1;
        if (
          Number.isNaN(start) ||
          Number.isNaN(end) ||
          start > end ||
          start >= stat.size
        ) {
          res.statusCode = 416;
          res.setHeader('Content-Range', `bytes */${stat.size}`);
          res.end();
          return;
        }
        res.statusCode = 206;
        res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
        res.setHeader('Content-Length', String(end - start + 1));
        if (req.method === 'HEAD') {
          res.end();
          return;
        }
        fs.createReadStream(targetPath, { start, end }).pipe(res);
        return;
      }
    }

    res.statusCode = 200;
    res.setHeader('Content-Length', String(stat.size));
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(targetPath).pipe(res);
  });
}

function workspaceStoragePlugin(): Plugin {
  return {
    name: 'workspace-local-storage-sync',
    configureServer(server) {
      attachWorkspaceStorageMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachWorkspaceStorageMiddleware(server.middlewares);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), workspaceStoragePlugin()],
  server: {
    watch: {
      ignored: ['**/storage/**'],
    },
  },
});
