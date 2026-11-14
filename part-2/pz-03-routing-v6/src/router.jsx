import { BrowserRouter, HashRouter } from 'react-router-dom';

// The address style is chosen at build time: VITE_ROUTER=hash gives /#/catalog, which a static host without redirect rules can serve.
// The default is the usual /catalog, and the app may live in a sub-folder of the server (Vite base), then basename is that folder.
export const routerSettings = (env = import.meta.env) => {
  const hash = env.VITE_ROUTER === 'hash';
  const base = String(env.BASE_URL ?? '/');
  // basename has no trailing slash, and the root address needs none at all.
  const basename = hash || base === '/' ? undefined : base.replace(/\/+$/, '');
  return { hash, basename };
};

export function AppRouter({ children, env }) {
  const { hash, basename } = routerSettings(env);
  const Router = hash ? HashRouter : BrowserRouter;
  return <Router basename={basename}>{children}</Router>;
}
