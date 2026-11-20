import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  installErrorReporter,
  initSentry,
} from '@mister-guiiug/dev-pwa-config/react/observability';
import { ThemeProvider } from '@mister-guiiug/dev-pwa-config/react/theme-provider';
import { ToastProvider } from '@mister-guiiug/dev-pwa-config/react/toast';
import { VersionProvider } from '@mister-guiiug/dev-pwa-config/react/version';
import { AuthProvider } from '@mister-guiiug/dev-pwa-config/react/auth-provider';
import { I18nProvider, initialLocale, loadLocale } from './i18n/index.ts';
import { authAdapter, onAuthEvent } from './auth/index.ts';
import { env } from './app/config/env.ts';
import { followAccountWithDraft } from './features/board/leaveDraft.ts';
import { App } from './App.tsx';
import './index.css';

/**
 * LA PILE DE FOURNISSEURS, ET SON ORDRE.
 *
 * L'ordre n'est pas décoratif :
 *
 *   1. `installErrorReporter()` AVANT tout le reste — une erreur levée au
 *      montage doit déjà être capturée, sinon la seule panne qu'on ne verra
 *      jamais est celle qui empêche l'app de s'afficher ;
 *   2. `initSentry` ne fait RIEN sans DSN, et ne charge alors pas une ligne de
 *      Sentry : le bundle d'une app sans observabilité reste intact ;
 *   3. `ThemeProvider` avant l'interface, pour que `data-theme` soit posé ;
 *   4. `I18nProvider` avant les composants du socle — il pose `LabelsProvider`
 *      avec la locale courante, ce que personne ne pensait à câbler à la main.
 *
 * Ce fichier est court, et c'est le but : la version longue est réécrite dans
 * chaque app, de 19 à 111 lignes selon les dépôts.
 */
installErrorReporter();
void initSentry({
  dsn: env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  // LE `loader` N'EST PAS FACULTATIF. Sans lui, le socle importe Sentry par
  // un nom que Vite ne peut pas lire (pour qu'une app sans le SDK construise
  // quand même) : dans le navigateur l'import échoue, `initSentry` avale
  // l'échec, et rien ne part, DSN posé ou non. C'était le cas ici jusqu'au
  // 06/11/2026, alors que la CSP, le déploiement et l'écran Réglages
  // annonçaient un Sentry en service. Le morceau qu'il charge est rangé à
  // part par `vite.config.ts` ; sans DSN, rien n'est téléchargé.
  loader: () => import('@sentry/react'),
});

// LE BROUILLON DU TABLEAU QUITTE L'ÉCRAN AVEC SON COMPTE (ADR 0015) : avant
// le premier rendu, pour qu'aucune déconnexion ne passe sans lui.
followAccountWithDraft();

const container = document.getElementById('app');
if (!container) throw new Error('Élément racine #app introuvable');

// LA LANGUE D'ABORD : l'anglais vit dans son morceau (`i18n/index.ts`). Il
// est chargé avant le premier rendu pour qui le lit — le français, langue de
// repli, est déjà là et ne retarde rien.
void loadLocale(initialLocale()).finally(() => {
  createRoot(container).render(
    <StrictMode>
      <VersionProvider>
        {/* `paint={false}` : les jetons `--dwc-*` sont peints par `index.css`
            avec la palette de l'app. Le fournisseur ne sert alors qu'à partager
            l'état clair/sombre et à tenir `data-theme` à jour — sans charger le
            catalogue des palettes de la famille. */}
        <ThemeProvider
          paint={false}
          themeColor={{ light: '#f5f9fb', dark: '#0c141a' }}
        >
          <I18nProvider>
            {/* L'adaptateur est `null` tant qu'aucun backend distant n'est
                configuré : le fournisseur se met alors en mode local, l'état
                reste « déconnecté », et les actions rendent une erreur nommée
                plutôt que d'échouer sur un client absent. `onAuthEvent` purge
                la copie de lecture à la déconnexion. */}
            <AuthProvider adapter={authAdapter()} onEvent={onAuthEvent}>
              <ToastProvider>
                <App />
              </ToastProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </VersionProvider>
    </StrictMode>
  );
});
