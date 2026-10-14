import { initAccordion } from './components/accordion.js';
import { initBurger } from './components/burger.js';
import { initDashboard } from './components/dashboard.js';
import { initEditor } from './components/editor.js';
import { initNotationFilter } from './components/notation-filter.js';
import { initSettings } from './components/settings.js';
import { initTheme } from './components/theme.js';
import { initWaitlistForm } from './components/waitlist-form.js';
import { getStorage } from './utils/storage.js';

export const COMPONENTS = [initTheme, initBurger, initAccordion, initNotationFilter, initWaitlistForm, initDashboard, initSettings, initEditor];

// Starts every component that finds its markup on the page; a failing component is reported and does not stop the others.
export const boot = (root, { components = COMPONENTS, logger = console } = {}) => {
  const storage = getStorage(root.defaultView);
  const started = [];
  components.forEach((init) => {
    try {
      if (init({ root, storage })) started.push(init.name);
    } catch (error) {
      logger.error(`DSLKit: component ${init.name} failed`, error);
    }
  });
  return started;
};

/* node:coverage disable */
if (typeof document !== 'undefined') boot(document);
/* node:coverage enable */
