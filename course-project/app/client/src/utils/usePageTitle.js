import { useEffect } from 'react';

// The tab title follows the page, so the history and the browser tabs say where the user is.
export function usePageTitle(title) {
  useEffect(() => {
    document.title = `${title} – DSLKit`;
  }, [title]);
}
