import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const STORAGE_DIR = path.resolve(__dirname, 'storage');
const PROGRESS_FILE = path.join(STORAGE_DIR, 'progress.json');
const MAX_BODY_BYTES = 2 * 1024 * 1024;

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
