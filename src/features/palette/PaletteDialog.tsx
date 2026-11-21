import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useI18n, type Locale } from '../../i18n/index.ts';
import { FORMATIONS } from '../board/formations.ts';
import { useReplaceDraft } from '../board/replaceDraft.tsx';
import { boardStore } from '../board/store.ts';
import { TERMS, type Term } from '../lexique/terms.ts';
import { useSchemas } from '../schemas/store.ts';
import { useSeances } from '../seances/store.ts';
import { filterCommands, type Command } from './commands.ts';

/**
 * UN MOT DU LEXIQUE SE TROUVE AUSSI PAR SON NOM ANGLAIS OU FRANÇAIS : les
 * deux langues des documents de formation, l'anglais étant aussi celle des
 * tournois. Un joueur allemand qui tape « free puck » trouve le Freistoß.
 */
const otherNames = (term: Term, lang: Locale) =>
  (['en', 'fr'] as const)
    .filter(other => other !== lang)
    .map(other => term[other].term)
    .join(' ');

function useCommands(): Command[] {
  const { t, locale: lang } = useI18n();
  const navigate = useNavigate();
  const replaceDraft = useReplaceDraft();
  const schemas = useSchemas(state => state.schemas);
  const seances = useSeances(state => state.seances);
  const seancesReady = useSeances(state => state.ready);
  const loadSeances = useSeances(state => state.load);

  // Les séances se lisent par le port (ADR 0018) : à la demande, la première
  // fois que la palette en a besoin.
  useEffect(() => {
    if (!seancesReady) void loadSeances();
  }, [seancesReady, loadSeances]);

  return useMemo(() => {
    const go = t('palette.groups.go');
    const board = t('palette.groups.board');
    /** Une action du tableau : on y va d'abord, puis on agit. */
    const onBoard = (run: () => void) => () => {
      void navigate('/');
      run();
    };
    const actions = () => boardStore.getState();
    const teams = [
      ['blanc', t('board.teamWhite')],
      ['noir', t('board.teamBlack')],
    ] as const;

    return [
      ...(
        [
          ['/', t('nav.home')],
          ['/schemas', t('nav.schemas')],
          ['/seances', t('nav.seances')],
          ['/notes', t('nav.notes')],
          ['/lexique', t('lexique.title')],
          ['/reglages', t('settings.title')],
          ['/compte', t('account.title')],
          ['/a-propos', t('about.title')],
        ] as const
      ).map(([href, label]) => ({
        id: `go:${href}`,
        group: go,
        label,
        run: () => void navigate(href),
      })),
      {
        id: 'board:add-step',
        group: board,
        label: t('board.addStep'),
        run: onBoard(() => actions().addStep()),
      },
      {
        id: 'board:undo',
        group: board,
        label: t('board.undo'),
        keywords: 'ctrl z',
        run: onBoard(() => actions().undo()),
      },
      {
        id: 'board:redo',
        group: board,
        label: t('board.redo'),
        keywords: 'ctrl y',
        run: onBoard(() => actions().redo()),
      },
      {
        id: 'board:play',
        group: board,
        label: t('palette.play'),
        run: onBoard(() => {
          if (actions().tactic.steps.length > 1) actions().play();
        }),
      },
      {
        id: 'board:mirror',
        group: board,
        label: t('board.mirror'),
        run: onBoard(() => actions().mirror()),
      },
      {
        id: 'board:kickoff',
        group: board,
        label: t('board.kickoff'),
        run: onBoard(() => actions().resetToKickoff()),
      },
      {
        id: 'board:follow-puck',
        group: board,
        label: t('board.followPuck'),
        keywords: 'arbitres',
        run: onBoard(() => actions().followPuck()),
      },
      {
        id: 'board:present',
        group: board,
        label: t('palette.present'),
        run: () => void navigate('/', { state: { present: true } }),
      },
      ...teams.flatMap(([team, teamLabel]) =>
        FORMATIONS.map(formation => ({
          id: `formation:${team}:${formation}`,
          group: t('palette.groups.formation'),
          label: t('palette.formation', { formation, team: teamLabel }),
          run: onBoard(() => actions().applyFormation(team, formation)),
        }))
      ),
      ...schemas.map(schema => ({
        id: `schema:${schema.id}`,
        group: t('palette.groups.schema'),
        label: t('palette.open', {
          name: schema.name || t('board.untitled'),
        }),
        run: () =>
          replaceDraft(() => {
            boardStore.getState().load(schema);
            void navigate('/');
          }),
      })),
      ...seances.map(seance => ({
        id: `seance:${seance.id}`,
        group: t('palette.groups.seance'),
        label: seance.name || t('seances.untitled'),
        run: () => void navigate(`/seances/${seance.id}`),
      })),
      ...TERMS.map(term => ({
        id: `term:${term.id}`,
        group: t('palette.groups.term'),
        label: term[lang].term,
        keywords: otherNames(term, lang),
        onlyWhenSearching: true,
        run: () =>
          void navigate(`/lexique?terme=${encodeURIComponent(term.id)}`),
      })),
    ];
  }, [t, lang, navigate, replaceDraft, schemas, seances]);
}

/** Le dialogue de la palette, chargé à la première ouverture. */
export function PaletteDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const commands = useCommands();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const shown = useMemo(
    () => filterCommands(commands, query),
    [commands, query]
  );
  const id = useId().replace(/:/g, '');
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  // Le focus revient là où il était : le clavier ne se perd pas.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    input.current?.focus();
    return () => before?.focus?.({ preventScroll: true });
  }, []);

  useEffect(() => {
    const option = list.current?.querySelector(`[data-index="${active}"]`);
    // jsdom n'a pas `scrollIntoView` : la liste suit l'option active dans
    // un navigateur, et ne lève rien ailleurs.
    if (typeof option?.scrollIntoView === 'function') {
      option.scrollIntoView({ block: 'nearest' });
    }
  }, [active]);

  const run = (command: Command | undefined) => {
    if (!command) return;
    onClose();
    command.run();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (shown.length === 0) return;
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setActive(i => (i + delta + shown.length) % shown.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(shown[active]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    } else if (event.key === 'Tab') {
      // Une seule chose à faire ici : taper. Le focus ne sort pas.
      event.preventDefault();
    }
  };

  const optionId = (i: number) => `${id}-option-${i}`;

  // Au bout de la page, comme les menus : aucun conteneur ne la rogne.
  return createPortal(
    <div
      className="uwh-palette"
      onPointerDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="uwh-palette__panel"
        role="dialog"
        aria-modal="true"
        aria-label={t('palette.label')}
      >
        <div className="uwh-palette__search">
          <Search size={18} aria-hidden="true" />
          <input
            ref={input}
            className="uwh-palette__input"
            role="combobox"
            aria-expanded="true"
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            aria-activedescendant={
              shown.length > 0 ? optionId(active) : undefined
            }
            aria-label={t('palette.label')}
            placeholder={t('palette.placeholder')}
            onKeyDown={onKeyDown}
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              setActive(0);
            }}
          />
          <kbd className="uwh-palette__kbd">{t('palette.escape')}</kbd>
        </div>
        <ul
          ref={list}
          id={`${id}-list`}
          className="uwh-palette__list"
          role="listbox"
          aria-label={t('palette.results')}
        >
          {shown.map((command, i) => (
            <li
              key={command.id}
              id={optionId(i)}
              data-index={i}
              role="option"
              aria-selected={i === active}
              className="uwh-palette__option"
              onPointerMove={() => setActive(i)}
              // Le focus reste dans le champ (motif « combobox ») : on
              // empêche le pointeur de le lui prendre, puis on exécute.
              onPointerDown={event => event.preventDefault()}
              onPointerUp={() => run(command)}
            >
              <span className="uwh-palette__label">{command.label}</span>
              <span className="uwh-palette__group">{command.group}</span>
            </li>
          ))}
        </ul>
        {shown.length === 0 ? (
          <p className="uwh-palette__none" role="status">
            {t('palette.none')}
          </p>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
