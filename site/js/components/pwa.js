// Registers the service worker that lets the site work without a network. The worker file lies in the root of the site, so its scope is the whole site.
export const registerServiceWorker = ({ navigator, url = new URL('../../sw.js', import.meta.url), logger = console } = {}) => {
  if (!navigator || !('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register(url.href).catch((error) => {
    logger.error('DSLKit: the service worker was not registered', error);
    return null;
  });
};
