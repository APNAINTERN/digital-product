import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import { hydrateAuthStore } from '@/stores/authStore';
import { hydrateThemeStore } from '@/stores/themeStore';
import '@/index.css';

hydrateThemeStore();
hydrateAuthStore();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
