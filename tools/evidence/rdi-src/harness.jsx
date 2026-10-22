import React from 'react';
import { createRoot } from 'react-dom/client';
import { initialize } from 'react-devtools-inline/frontend';

const iframe = document.getElementById('target');
const params = new URLSearchParams(location.search);
iframe.src = params.get('src') || 'http://localhost:5173/';
const DevTools = initialize(iframe.contentWindow);
createRoot(document.getElementById('root')).render(
  <DevTools browserTheme="light" defaultTab={params.get('tab') || 'components'} showTabBar={true} hideToggleErrorAction hideToggleSuspenseAction hideLogAction hideViewSourceAction />,
);
iframe.addEventListener('load', () => setTimeout(() => iframe.contentWindow.postMessage({ source: 'rdt-harness', type: 'activate' }, '*'), 300));
