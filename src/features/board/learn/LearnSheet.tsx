import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Sheet } from '@mister-guiiug/dev-pwa-config/react/sheet';
import { useMediaQuery } from '@mister-guiiug/dev-pwa-config/react/use-media-query';
import { trackEvent } from '@mister-guiiug/dev-pwa-config/analytics';
import { useI18n } from '../../../i18n/index.ts';
import { PORTRAIT_BELOW } from '../Board2D.tsx';
import { playerTitle, useBoardLabels } from '../labels.ts';
import { visiblePlayers, type PlayerIdentity, type Tactic } from '../model.ts';
import { LearnBoard } from './LearnBoard.tsx';
import {
  checkRound,
  movingPlayers,
  nextStage,
  startRound,
  summarize,
  VERDICT_LIMITS,
  type LearnStage,
} from './rounds.ts';
// Avec le morceau secondaire, pas avec l'accueil (ADR 0022).
import './learn.css';

interface Props {
  /**
   * Le schéma tel qu'il était à l'ouverture. Le jeu le lit, ne le modifie
   * jamais, et ne le relit pas : un geste au tableau pendant la partie ne la
   * change pas.
   */
  tactic: Tactic;
  /** Le jeton sélectionné au tableau, s'il y en a un. */
  selected: string | null;
  onClose: () => void;
}

/**
 * « À TOI DE JOUER » (ADR 0022) : un joueur apprend ses placements. Il
 * choisit qui il est ; chaque étape paraît, tous à leur place sauf lui,
 * resté où il était ; il pose son jeton, vérifie, voit l'écart ; à la fin,
 * un bilan.
 *
 * Plein écran au téléphone : le terrain dressé y prend toute la hauteur.
 */
export function LearnSheet({ tactic, selected, onClose }: Props) {
  const { t, fmt, m } = useI18n();
  const labels = useBoardLabels();
  /*
   * DRESSÉ SOUS LA LARGEUR OÙ LE TABLEAU SE DRESSE, lue à l'écran : `Board2D`
   * en `auto` mesure sa boîte, plus étroite que l'écran, et se dresse donc
   * aussi. Au-delà, on lui impose le paysage. Le calque suit la même règle :
   * les deux ne peuvent pas diverger.
   */
  const portrait = useMediaQuery(`(max-width: ${PORTRAIT_BELOW - 0.02}px)`);
  const playable = tactic.steps.length > 1;
  const movers = useMemo(() => movingPlayers(tactic), [tactic]);
  const [stage, setStage] = useState<LearnStage>(() => {
    // Le jeton sélectionné au tableau, s'il est un joueur : la partie part
    // de lui, sans rien demander.
    const chosen = visiblePlayers(tactic).find(p => p.id === selected);
    return playable && chosen
      ? startRound(tactic, chosen.id)
      : { kind: 'choose' };
  });
  const chooseId = `learn-choose-${useId().replace(/:/g, '')}`;
  const actions = useRef<HTMLDivElement>(null);
  /** « Vérifier » par Entrée : le jeton disparaît, le focus va à la suite. */
  const focusActions = useRef(false);
  useEffect(() => {
    if (!focusActions.current) return;
    focusActions.current = false;
    actions.current?.querySelector('button')?.focus();
  });

  const total = tactic.steps.length;
  const gap = (metres: number) => labels.formatDistance(metres);
  const playerOf = (id: string) =>
    tactic.roster.players.find(p => p.id === id)!;
  const nameOf = (player: PlayerIdentity) =>
    [playerTitle(t, player), player.name].filter(Boolean).join(' · ');

  const check = (fromKeyboard: boolean) => {
    focusActions.current = fromKeyboard;
    setStage(current => checkRound(tactic, current));
  };

  const next = () => {
    const after = nextStage(tactic, stage);
    if (after.kind === 'summary') {
      const { steps, right } = summarize(after.results);
      trackEvent('a_toi_de_jouer', { etapes: steps, justes: right });
    }
    setStage(after);
  };

  /*
   * UNE SEULE RÉGION ANNONCÉE, présente dès l'ouverture : la consigne, puis
   * le verdict, puis le bilan. Insérée au moment du message, elle ne serait
   * pas toujours lue.
   */
  let status = '';
  let verdict: string | undefined;
  if (stage.kind === 'round') {
    if (stage.checked) {
      verdict = stage.checked.verdict;
      status = t('learn.verdict', {
        verdict: t(`learn.verdicts.${stage.checked.verdict}`),
        gap: gap(stage.checked.gap),
      });
    } else {
      status = t('learn.instruction');
    }
  } else if (stage.kind === 'summary') {
    const summary = summarize(stage.results);
    status = `${fmt.plural(summary.right, m.learn.summary, {
      right: summary.right,
      count: summary.steps,
    })} ${t('learn.meanGap', { gap: gap(summary.meanGap) })}`;
  }

  const footer =
    stage.kind === 'round' ? (
      <div ref={actions} className="uwh-learn__actions">
        {stage.checked ? (
          <Button variant="primary" block onClick={next}>
            {stage.step + 1 >= total ? t('learn.finish') : t('learn.next')}
          </Button>
        ) : (
          <Button variant="primary" block onClick={() => check(false)}>
            {t('learn.check')}
          </Button>
        )}
      </div>
    ) : stage.kind === 'summary' ? (
      <div ref={actions} className="uwh-learn__actions">
        <Button
          variant="primary"
          block
          onClick={() => setStage(startRound(tactic, stage.player))}
        >
          {t('learn.restart')}
        </Button>
      </div>
    ) : undefined;

  const note =
    stage.kind === 'round' && stage.checked
      ? tactic.steps[stage.step]!.note
      : '';

  return (
    <Sheet
      open
      title={t('learn.action')}
      onClose={onClose}
      className="uwh-learn-sheet"
      footer={footer}
    >
      <div className="uwh-learn">
        {stage.kind === 'choose' ? null : (
          <div className="uwh-learn__head">
            <p className="uwh-subtitle">
              {stage.kind === 'round'
                ? t('learn.progress', {
                    player: nameOf(playerOf(stage.player)),
                    step: stage.step + 1,
                    total,
                  })
                : nameOf(playerOf(stage.player))}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStage({ kind: 'choose' })}
            >
              {t('learn.change')}
            </Button>
          </div>
        )}
        <p className="uwh-learn__status" role="status" data-verdict={verdict}>
          {status}
        </p>

        {stage.kind === 'choose' ? (
          !playable ? (
            <p className="m-0">{t('learn.oneStep')}</p>
          ) : movers.length === 0 ? (
            <p className="m-0">{t('learn.nobody')}</p>
          ) : (
            <>
              <h3 className="uwh-subtitle" id={chooseId}>
                {t('learn.choose')}
              </h3>
              <ul className="uwh-learn__players" aria-labelledby={chooseId}>
                {movers.map(player => (
                  <li key={player.id}>
                    <Button
                      variant="secondary"
                      block
                      onClick={() => setStage(startRound(tactic, player.id))}
                    >
                      {nameOf(player)}
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )
        ) : null}

        {stage.kind === 'round' ? (
          <LearnBoard
            tactic={tactic}
            step={stage.step}
            player={playerOf(stage.player)}
            guess={stage.guess}
            checked={stage.checked}
            portrait={portrait}
            labels={labels}
            // Le prénom aussi, quand le schéma en a un (ADR 0028) : partout
            // ailleurs, le jeu nomme déjà le joueur par `nameOf`.
            tokenLabel={t('learn.token', {
              player: nameOf(playerOf(stage.player)),
            })}
            tokenHelp={t('learn.tokenHelp')}
            onGuess={guess =>
              setStage(current =>
                current.kind === 'round' && !current.checked
                  ? { ...current, guess }
                  : current
              )
            }
            onCheck={() => check(true)}
          />
        ) : null}
        {note ? <p className="uwh-learn__note">{note}</p> : null}

        {stage.kind === 'summary' ? (
          <>
            <ol className="uwh-learn__results">
              {stage.results.map(result => (
                <li key={result.step} data-verdict={result.verdict}>
                  {t('learn.result', {
                    step: result.step + 1,
                    verdict: t(`learn.verdicts.${result.verdict}`),
                    gap: gap(result.gap),
                  })}
                </li>
              ))}
            </ol>
            <p className="m-0 text-supporting">
              {t('learn.limits', {
                right: gap(VERDICT_LIMITS.right),
                close: gap(VERDICT_LIMITS.close),
              })}
            </p>
          </>
        ) : null}
      </div>
    </Sheet>
  );
}
