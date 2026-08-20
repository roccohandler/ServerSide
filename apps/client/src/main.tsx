import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { loadAnalytics } from './lib/analytics';
import '@jobforge/ui/styles/global.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element #root is missing from index.html.');
}

/*
 * Before the first render, and outside React entirely.
 *
 * Outside, because it is not a component's concern and a `useEffect` in `App` would run after
 * the first paint — losing the page view for anybody who leaves during it, which is exactly
 * the population a bounce rate is about. Also because an effect in StrictMode runs twice.
 *
 * It does nothing at all unless a provider is configured. See DECISION 039.
 */
loadAnalytics();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
