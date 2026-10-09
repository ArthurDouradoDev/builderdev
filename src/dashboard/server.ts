import { readFile, stat } from 'node:fs/promises';
import { type IncomingMessage, type Server, type ServerResponse, createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { type Scan, scanRoot } from './scan';

export const DEFAULT_PORT = 4317;
const HOST = '127.0.0.1';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

export interface ServerOptions {
  /** Pasta cujas subpastas são os projetos. */
  root: string;
  /** 0 escolhe uma porta livre. */
  port: number;
  /** Pasta com `index.html` e os arquivos da UI. */
  uiDir: string;
}

export interface DashboardServer {
  url: string;
  port: number;
  server: Server;
  /** Varredura da raiz; pedidos simultâneos dividem a mesma. */
  scan(): Promise<Scan>;
  close(): Promise<void>;
}

/** Sobe o painel em 127.0.0.1. Rejeita com o erro do `listen` (ex.: `EADDRINUSE`). */
export async function startServer({ root, port, uiDir }: ServerOptions): Promise<DashboardServer> {
  const ui = resolve(uiDir);
  let pending: Promise<Scan> | null = null;
  const scan = () => {
    pending ??= scanRoot(root).finally(() => {
      pending = null;
    });
    return pending;
  };

  let actualPort = port;
  const server = createServer((req, res) => {
    handle(req, res, { port: actualPort, ui, scan }).catch((err: unknown) => {
      send(res, 500, 'text/plain; charset=utf-8', `erro interno: ${(err as Error).message}`);
    });
  });

  await new Promise<void>((done, fail) => {
    server.once('error', fail);
    server.listen(port, HOST, () => {
      server.off('error', fail);
      done();
    });
  });
  actualPort = (server.address() as AddressInfo).port;

  return {
    url: `http://${HOST}:${actualPort}`,
    port: actualPort,
    server,
    scan,
    close: () =>
      new Promise((done) => {
        server.close(() => done());
        server.closeAllConnections();
      }),
  };
}

interface Context {
  port: number;
  ui: string;
  scan: () => Promise<Scan>;
}

async function handle(req: IncomingMessage, res: ServerResponse, ctx: Context): Promise<void> {
  // Um site qualquer pode apontar o próprio domínio para 127.0.0.1 (DNS rebinding); o Host denuncia.
  const allowed = [`${HOST}:${ctx.port}`, `localhost:${ctx.port}`];
  if (!allowed.includes((req.headers.host ?? '').toLowerCase())) {
    return send(res, 403, 'text/plain; charset=utf-8', 'host não permitido');
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, 'text/plain; charset=utf-8', 'só GET');
  }

  const pathname = new URL(req.url ?? '/', `http://${HOST}`).pathname;
  if (pathname === '/api/projects') {
    return send(res, 200, CONTENT_TYPES['.json']!, JSON.stringify(await ctx.scan()));
  }
  if (pathname.startsWith('/api/')) {
    return send(res, 404, CONTENT_TYPES['.json']!, JSON.stringify({ error: 'rota desconhecida' }));
  }

  const file = (await staticFile(ctx.ui, pathname)) ?? join(ctx.ui, 'index.html');
  const type = CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
  try {
    send(res, 200, type, await readFile(file));
  } catch {
    send(res, 404, 'text/plain; charset=utf-8', 'UI não encontrada: rode npm run build');
  }
}

/** Arquivo de `ui` pedido em `pathname`, ou `null` se não existir ou cair fora de `ui`. */
async function staticFile(ui: string, pathname: string): Promise<string | null> {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const file = resolve(ui, `.${decoded}`);
  const rel = relative(ui, file);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;
  try {
    return (await stat(file)).isFile() ? file : null;
  } catch {
    return null;
  }
}

function send(res: ServerResponse, status: number, type: string, body: string | Buffer): void {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'",
  });
  res.end(body);
}
