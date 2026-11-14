import { useEffect } from 'react';

// The tab title follows the page, so that history entries and screen readers can tell the pages apart.
export function usePageTitle(title) {
  useEffect(() => {
    document.title = `${title} — DSLKit`;
  }, [title]);
}
