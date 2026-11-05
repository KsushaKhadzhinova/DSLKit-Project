import { render, screen } from '@testing-library/react';
import { Link, Route, Routes } from 'react-router-dom';
import { AppRouter, routerSettings } from './router';

describe('router settings', () => {
  it('uses the usual router at the root of the server', () => {
    expect(routerSettings({ BASE_URL: '/' })).toEqual({ hash: false, basename: undefined });
    expect(routerSettings({})).toEqual({ hash: false, basename: undefined });
  });

  it('uses the sub-folder of the build as basename, without the trailing slash', () => {
    expect(routerSettings({ BASE_URL: '/dslkit/' })).toEqual({ hash: false, basename: '/dslkit' });
    expect(routerSettings({ BASE_URL: '/a/b//' })).toEqual({ hash: false, basename: '/a/b' });
  });

  it('switches to the hash router with VITE_ROUTER=hash and then needs no basename', () => {
    expect(routerSettings({ VITE_ROUTER: 'hash', BASE_URL: '/dslkit/' })).toEqual({ hash: true, basename: undefined });
    expect(routerSettings({ VITE_ROUTER: 'browser' })).toEqual({ hash: false, basename: undefined });
  });
});

describe('AppRouter', () => {
  const tree = (
    <>
      <Link to="/catalog">go</Link>
      <Routes>
        <Route path="*" element={<p>page</p>} />
      </Routes>
    </>
  );

  it('writes links with the base folder', () => {
    window.history.pushState({}, '', '/dslkit/');
    render(<AppRouter env={{ BASE_URL: '/dslkit/' }}>{tree}</AppRouter>);
    expect(screen.getByRole('link', { name: 'go' })).toHaveAttribute('href', '/dslkit/catalog');
  });

  it('writes links with a hash in the hash mode', () => {
    window.history.pushState({}, '', '/');
    render(<AppRouter env={{ VITE_ROUTER: 'hash' }}>{tree}</AppRouter>);
    expect(screen.getByRole('link', { name: 'go' })).toHaveAttribute('href', '#/catalog');
  });
});
