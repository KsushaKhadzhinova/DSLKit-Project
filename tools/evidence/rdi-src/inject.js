import { activate, initialize } from 'react-devtools-inline/backend';
if (window !== window.top) {
  try { sessionStorage.setItem('React::DevTools::reloadAndProfile', 'true'); } catch (e) {}
  initialize(window);
  window.addEventListener('message', (e) => {
    if (e.data && e.data.source === 'rdt-harness' && e.data.type === 'activate') activate(window);
  });
}
