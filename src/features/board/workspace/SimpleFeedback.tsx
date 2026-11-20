import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useLocalStorage } from '@mister-guiiug/dev-pwa-config/react/use-local-storage';
import { trackEvent } from '@mister-guiiug/dev-pwa-config/analytics';
import {
  currentIssueReportMailto,
  emailAddress,
  featureRequestUrl,
} from '@mister-guiiug/dev-pwa-config/issue-report';
import { useI18n } from '../../../i18n/index.ts';
import { APP_ID, REPO_URL } from '../../../app/links.ts';

/** Après combien d'ouvertures en mode simple la question se pose. */
export const ASK_AFTER = 3;
const USES = 'mister-uwh-tactic:usages-simple';
const ANSWER = 'mister-uwh-tactic:avis-simple';
const COUNTED = 'mister-uwh-tactic:usage-compte';

/**
 * UN RETOUR EN UN GESTE (ADR 0020, suite). La mesure ne voit que ceux qui
 * l'acceptent — quatre visiteurs la semaine du 20/11/2026 : trop peu pour
 * conclure. Après quelques ouvertures en mode simple, une carte demande
 * « Le tableau est-il facile à utiliser ? ». « Pas encore » propose de dire
 * ce qui bloque : par courriel (la plupart des entraîneurs n'ont pas de
 * compte GitHub), ou sur GitHub. La réponse est retenue : la question ne
 * revient pas.
 */
export function SimpleFeedback() {
  const { t } = useI18n();
  const [uses, setUses] = useLocalStorage<number>(USES, 0);
  const [answer, setAnswer] = useLocalStorage<'oui' | 'pas-encore' | null>(
    ANSWER,
    null
  );
  const [asked, setAsked] = useState(false);
  const [closed, setClosed] = useState(false);

  // Une ouverture par session, pas un rendu par seconde.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(COUNTED)) return;
      sessionStorage.setItem(COUNTED, '1');
    } catch {
      return;
    }
    setUses(value => value + 1);
  }, [setUses]);

  if (closed) return null;
  if (!asked && (answer !== null || uses < ASK_AFTER)) return null;

  const reply = (avis: 'oui' | 'pas-encore') => {
    setAnswer(avis);
    trackEvent('avis_mode_simple', { avis });
    if (avis === 'pas-encore') setAsked(true);
    else setClosed(true);
  };

  const contact = emailAddress(import.meta.env.VITE_PRIVACY_CONTACT);
  const github = featureRequestUrl({
    repoUrl: REPO_URL,
    title: t('feedback.issueTitle'),
  });

  return (
    <div
      className="uwh-modecard"
      role="region"
      aria-label={t('feedback.title')}
    >
      <div className="uwh-row uwh-row--between">
        <p className="m-0 font-semibold">
          {asked ? t('feedback.tellUs') : t('feedback.question')}
        </p>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={t('feedback.close')}
          onClick={() => setClosed(true)}
        >
          <X size={16} aria-hidden="true" />
        </Button>
      </div>
      {asked ? (
        <div className="uwh-row">
          {contact ? (
            <button
              type="button"
              className="uwh-link"
              onClick={() => {
                // Rempli à l'instant du clic : écran et version du moment.
                window.location.href = currentIssueReportMailto({
                  to: contact,
                  app: APP_ID,
                  subject: t('feedback.issueTitle'),
                  intro: t('feedback.mailIntro'),
                });
              }}
            >
              {t('feedback.byMail')}
            </button>
          ) : null}
          {github ? (
            <a
              href={github}
              target="_blank"
              rel="noreferrer"
              className="uwh-link"
            >
              {t('feedback.onGithub')}
            </a>
          ) : null}
        </div>
      ) : (
        <div className="uwh-row">
          <Button size="sm" variant="outline" onClick={() => reply('oui')}>
            {t('feedback.yes')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => reply('pas-encore')}
          >
            {t('feedback.notYet')}
          </Button>
        </div>
      )}
    </div>
  );
}
