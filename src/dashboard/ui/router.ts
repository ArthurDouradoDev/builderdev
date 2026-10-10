// Rotas por `#`: o servidor devolve o index.html para qualquer caminho, mas a UI navega só pelo hash.
//   #/                          tela geral (com ?filtro=...&busca=...)
//   #/p/<nome>                  página do projeto
//   #/p/<nome>/<plano>[/<fase>] fluxo do plano, com a fase selecionada

export type Route =
  | { view: 'home' }
  | { view: 'project'; name: string }
  | { view: 'plan'; name: string; plan: string; phase: string | null };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '').split('?')[0] ?? '';
  const parts = path.split('/').filter(Boolean);
  if (parts[0] !== 'p' || parts.length < 2 || parts.length > 4) return { view: 'home' };
  let decoded: string[];
  try {
    decoded = parts.slice(1).map(decodeURIComponent);
  } catch {
    return { view: 'home' };
  }
  const [name, plan, phase] = decoded;
  if (!name) return { view: 'home' };
  if (!plan) return { view: 'project', name };
  return { view: 'plan', name, plan, phase: phase ?? null };
}

export function routeHash(route: Route): string {
  const enc = encodeURIComponent;
  switch (route.view) {
    case 'home':
      return '#/';
    case 'project':
      return `#/p/${enc(route.name)}`;
    case 'plan':
      return `#/p/${enc(route.name)}/${enc(route.plan)}${route.phase ? `/${enc(route.phase)}` : ''}`;
  }
}

/** Mesmo lugar, outro estado (ex.: fase selecionada): troca a URL sem criar entrada no histórico. */
export function replaceRoute(route: Route): void {
  const hash = routeHash(route);
  if (location.hash !== hash) history.replaceState(null, '', hash);
}
