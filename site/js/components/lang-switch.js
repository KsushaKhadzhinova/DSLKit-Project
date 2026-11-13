// The links to the other language of the page keep the place of the visitor: the query (the open project, the documentation section)
// and the hash (the section of the page). Absolute addresses and addresses from the site root (error pages) are not touched.
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/)/i;

export const initLangSwitch = ({ root = document } = {}) => {
  const links = [...root.querySelectorAll('a[hreflang][href]')].filter((link) => !EXTERNAL.test(link.getAttribute('href')));
  if (links.length === 0) return null;
  const { search, hash } = root.defaultView.location;
  links.forEach((link) => link.setAttribute('href', `${link.getAttribute('href').split(/[?#]/)[0]}${search}${hash}`));
  return links;
};
