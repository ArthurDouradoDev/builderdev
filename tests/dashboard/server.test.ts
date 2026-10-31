import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PlanView } from '../../src/dashboard/plan-view';
import type { Scan } from '../../src/dashboard/scan';
import { type DashboardServer, type ProjectPage, startServer } from '../../src/dashboard/server';
import { commit, git, planSource, useIsolatedGit, writePlan } from '../helpers/repo';

useIsolatedGit();

let base: string;
let dashboard: DashboardServer;

// base/
//   package.json   ← não pode vazar pela UI
//   ui/            ← uiDir
//   projetos/      ← raiz varrida
beforeAll(async () => {
  base = mkdtempSync(join(tmpdir(), 'builderdev-server-'));
  writeFileSync(join(base, 'package.json'), '{"segredo": true}');
  const ui = join(base, 'ui');
  mkdirSync(join(ui, 'sub'), { recursive: true });
  writeFileSync(join(ui, 'index.html'), '<!doctype html><p>painel</p>');
  writeFileSync(join(ui, 'app.js'), 'console.log("app");');
  writeFileSync(join(ui, 'styles.css'), 'body{}');
  writeFileSync(join(ui, 'sub', 'x.svg'), '<svg/>');

  const root = join(base, 'projetos');
  mkdirSync(join(root, 'comum'), { recursive: true });
  mkdirSync(join(root, 'repo'));
  git(join(root, 'repo'), 'init', '-q', '-b', 'main');
  git(join(root, 'repo'), 'commit', '-q', '--allow-empty', '-m', 'feat: início');

  // Projeto com BuilderDev e espaço no nome: dois planos, a f1 do mais novo concluída.
  const bd = join(root, 'com bd');
  mkdirSync(bd);
  git(bd, 'init', '-q', '-b', 'main');
  writePlan(bd, 'antigo', planSource('antigo', [{ id: 'f1' }]).replace('title: Plano antigo', 'title: Plano antigo\ncreated: 2026-01-01'));
  writePlan(bd, 'novo', planSource('novo', [{ id: 'f1' }, { id: 'f2' }]).replace('title: Plano novo', 'title: Plano novo\ncreated: 2026-09-01'));
  git(bd, 'add', '.');
  git(bd, 'commit', '-q', '-m', 'docs: planos');
  commit(bd, 'feat: entrega da f1', 'novo/f1');

  dashboard = await startServer({ root, port: 0, uiDir: ui });
});

afterAll(async () => {
  await dashboard?.close();
  rmSync(base, { recursive: true, force: true });
});

interface Reply {
  status: number;
  type: string;
  body: string;
  headers: Record<string, string | string[] | undefined>;
}

/** Pedido cru: o caminho vai como está, sem a normalização que o fetch faria. */
function get(path: string, { method = 'GET', host }: { method?: string; host?: string } = {}): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const req = request(
      { host: '127.0.0.1', port: dashboard.port, path, method, headers: { host: host ?? `127.0.0.1:${dashboard.port}` } },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode!, type: String(res.headers['content-type']), body, headers: res.headers }));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

describe('servidor do painel', { timeout: 30_000 }, () => {
  it('escuta só em 127.0.0.1, na porta escolhida pelo sistema', () => {
    expect(dashboard.port).toBeGreaterThan(0);
    expect(dashboard.url).toBe(`http://127.0.0.1:${dashboard.port}`);
  });

  it('GET /api/projects devolve a varredura em JSON', async () => {
    const res = await get('/api/projects');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/^application\/json/);
    const scan = JSON.parse(res.body) as Scan;
    expect(scan.root).toBe(join(base, 'projetos'));
    expect(scan.projects.map((p) => [p.name, p.kind]).sort()).toEqual([
      ['com bd', 'builderdev'],
      ['comum', 'sem-git'],
      ['repo', 'git'],
    ]);
    expect(scan.projects.find((p) => p.name === 'repo')!.git!.lastCommit!.subject).toBe('feat: início');
  });

  it('aceita localhost:<porta> no Host e recusa outros com 403', async () => {
    expect((await get('/api/projects', { host: `localhost:${dashboard.port}` })).status).toBe(200);
    expect((await get('/api/projects', { host: 'evil.com' })).status).toBe(403);
    expect((await get('/', { host: `evil.com:${dashboard.port}` })).status).toBe(403);
    expect((await get('/', { host: '127.0.0.1:1' })).status).toBe(403);
  });

  it('só aceita GET', async () => {
    const res = await get('/api/projects', { method: 'POST' });
    expect(res.status).toBe(405);
    expect(res.headers.allow).toBe('GET');
    expect((await get('/', { method: 'DELETE' })).status).toBe(405);
  });

  it('serve os arquivos da UI com o tipo pela extensão', async () => {
    const js = await get('/app.js');
    expect(js.status).toBe(200);
    expect(js.type).toMatch(/^text\/javascript/);
    expect(js.body).toContain('console.log');
    expect((await get('/styles.css')).type).toMatch(/^text\/css/);
    expect((await get('/sub/x.svg')).type).toBe('image/svg+xml');
    expect((await get('/')).body).toContain('painel');
  });

  it('não sai de uiDir', async () => {
    for (const path of ['/../package.json', '/..%2fpackage.json', '/%2e%2e/package.json', '/sub/..%2f..%2fpackage.json', '/..%5cpackage.json']) {
      const res = await get(path);
      expect(res.body, path).not.toContain('segredo');
      expect(res.body, path).toContain('painel');
    }
  });

  it('caminho desconhecido devolve o index.html', async () => {
    const res = await get('/qualquer/coisa');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/^text\/html/);
    expect(res.body).toContain('painel');
  });

  it('rota de API desconhecida recebe 404', async () => {
    expect((await get('/api/nada')).status).toBe(404);
  });

  it('GET /api/projects/<nome> devolve o card e os planos, do mais recente ao mais antigo', async () => {
    const res = await get('/api/projects/com%20bd');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/^application\/json/);
    const page = JSON.parse(res.body) as ProjectPage;
    expect(page.project).toMatchObject({ name: 'com bd', kind: 'builderdev', error: null });
    expect(page.project.git!.lastCommit!.subject).toBe('feat: entrega da f1');
    expect(page.plans.map((p) => [p.id, p.created, `${p.done}/${p.total}`])).toEqual([
      ['novo', '2026-09-01', '1/2'],
      ['antigo', '2026-01-01', '0/1'],
    ]);

    // Projeto sem BuilderDev também tem página, sem planos.
    const repo = JSON.parse((await get('/api/projects/repo')).body) as ProjectPage;
    expect(repo).toMatchObject({ project: { name: 'repo', kind: 'git' }, plans: [] });
  });

  it('GET /api/projects/<nome>/plans/<id> devolve o planView', async () => {
    const res = await get('/api/projects/com%20bd/plans/novo');
    expect(res.status).toBe(200);
    const view = JSON.parse(res.body) as PlanView;
    expect(view).toMatchObject({ id: 'novo', title: 'Plano novo', done: 1, total: 2 });
    expect(view.phases.map((p) => [p.id, p.status, p.commits.map((c) => c.subject)])).toEqual([
      ['f1', 'concluida', ['feat: entrega da f1']],
      ['f2', 'pendente', []],
    ]);
    expect(view.phases[0]!.sections.objective).toBe('Texto exclusivo da f1.');
  });

  it('projeto ou plano desconhecido recebe 404 com a mensagem em JSON', async () => {
    for (const path of ['/api/projects/nada', '/api/projects/nada/plans/novo', '/api/projects/com%20bd/plans/nada', '/api/projects/repo/plans/x', '/api/projects/comum/plans/x']) {
      const res = await get(path);
      expect(res.status, path).toBe(404);
      expect(res.type, path).toMatch(/^application\/json/);
      expect(JSON.parse(res.body).error, path).toBeTruthy();
    }
    expect(JSON.parse((await get('/api/projects/com%20bd/plans/nada')).body).error).toMatch(/existentes: antigo, novo/);
  });

  it('o nome nunca vira caminho: .., %2e%2e, barras codificadas e codificação inválida recebem 404', async () => {
    for (const path of [
      '/api/projects/%2e%2e',
      '/api/projects/%2E%2E/plans/novo',
      '/api/projects/..',
      '/api/projects/.',
      '/api/projects/%2e%2e%2fprojetos',
      '/api/projects/..%5cpackage.json',
      '/api/projects/com%20bd%2f..%2f..',
      '/api/projects/%E0%A4%A',
      '/api/projects/com%20bd/plans/..%2f..%2fpackage',
      '/api/projects/com%20bd/plans/..%5cpackage',
      '/api/projects/com%20bd/extra',
    ]) {
      const res = await get(path);
      expect(res.status, path).toBe(404);
      expect(res.body, path).not.toContain('segredo');
    }
  });

  it('a porta ocupada rejeita com EADDRINUSE', async () => {
    await expect(startServer({ root: base, port: dashboard.port, uiDir: base })).rejects.toMatchObject({ code: 'EADDRINUSE' });
  });
});
