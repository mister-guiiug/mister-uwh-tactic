import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '../../i18n/index.ts';
import { Board2D, type Board2DLabels } from './Board2D.tsx';
import { StepMarks } from './panels/StepMarks.tsx';
import { BoardToolbar } from './workspace/BoardToolbar.tsx';
import { boardStore } from './store.ts';
import { createTactic, type Tactic } from './model.ts';

/**
 * Ce que ces tests figent : ZONES ET MOTS SE DESSINENT PARTOUT OÙ PASSE
 * `Board2D` (ADR 0026) — le tableau, ses images, le mode simple —, SOUS les
 * jetons ; l'outil « Zone » en trace une d'un glisser, l'outil « Mot » en
 * pose un d'un toucher ; l'onglet « Étape » les modifie et les supprime.
 */

const labels: Board2DLabels = {
  pitch: 'Terrain',
  help: 'Aide',
  puck: 'Palet',
  player: p => `${p.team} ${p.number}`,
  referee: r => `arbitre ${r.number}`,
  formatDistance: m => `${m.toFixed(1)} m`,
  wordPrompt: 'Mot à poser',
  wordPlace: 'Poser',
};

function annotated(): Tactic {
  const t = createTactic({ id: 't', name: '', now: '2026-11-21T00:00:00Z' });
  t.steps[0]!.zones = [
    { shape: 'rect', x: 2, y: 1, w: 8, h: 3, label: 'Couloir' },
    { shape: 'ellipse', x: 15, y: 5, w: 6, h: 4 },
  ];
  t.steps[0]!.words = [{ x: 12, y: 7, text: 'Pressing' }];
  return t;
}

const step = () => boardStore.getState().tactic.steps[0]!;

beforeEach(() => boardStore.getState().load(annotated()));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('le dessin', () => {
  it('dessine zones, étiquette et mots, sous les jetons', () => {
    const { container } = render(<Board2D labels={labels} />);
    const zones = container.querySelectorAll('[data-zone]');
    expect([...zones].map(z => z.getAttribute('data-zone'))).toEqual([
      'rect',
      'ellipse',
    ]);
    expect(zones[0]!.querySelector('rect')).toHaveAttribute('width', '8');
    expect(zones[1]!.querySelector('ellipse')).toHaveAttribute('rx', '3');
    expect(screen.getByText('Couloir')).toBeInTheDocument();
    const word = container.querySelector('[data-word]')!;
    expect(word).toHaveTextContent('Pressing');
    // Sous les jetons : avant eux dans le document, et sans geste.
    const token = container.querySelector('[data-token]')!;
    for (const mark of [zones[0]!, word]) {
      expect(
        mark.compareDocumentPosition(token) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(mark.closest('[pointer-events="none"]')).not.toBeNull();
    }
  });

  it('les images (impression, image d’étape, vidéo) et le mode simple les montrent aussi', () => {
    const image = render(
      <Board2D labels={labels} tactic={annotated()} playhead={0} />
    );
    expect(image.container.querySelectorAll('[data-zone]')).toHaveLength(2);
    expect(image.container.querySelector('[data-word]')).not.toBeNull();
    cleanup();
    const pawns = render(<Board2D labels={labels} variant="pawns" />);
    expect(pawns.container.querySelectorAll('[data-zone]')).toHaveLength(2);
    expect(pawns.container.querySelector('[data-word]')).not.toBeNull();
  });

  it('terrain dressé, zones et mots restent droits à l’écran', () => {
    // Une boîte de téléphone : sous 640 px, le terrain se dresse.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ width: 400, height: 700 })
    );
    const { container } = render(<Board2D labels={labels} />);
    const turn = (selector: string) =>
      container
        .querySelector(`${selector} g[transform]`)!
        .getAttribute('transform');
    expect(turn('[data-word]')).toBe('translate(12 7) rotate(-90)');
    expect(turn('[data-zone]')).toBe('translate(6 2.5) rotate(-90)');
  });
});

describe('les outils', () => {
  /**
   * jsdom ne calcule pas de matrice d'écran : on la pose à l'identité, un
   * pixel du pointeur vaut un mètre du terrain.
   */
  beforeEach(() => {
    const identity = { inverse: () => identity };
    Object.defineProperty(SVGElement.prototype, 'getScreenCTM', {
      configurable: true,
      value: () => identity,
    });
    vi.stubGlobal(
      'DOMPoint',
      class {
        constructor(
          readonly x = 0,
          readonly y = 0
        ) {}
        matrixTransform() {
          return { x: this.x, y: this.y };
        }
      }
    );
  });

  const svg = (container: HTMLElement) => container.querySelector('svg')!;

  it('« Zone » : un glisser ombre une zone de la forme choisie ; un clic, rien', () => {
    boardStore.getState().load(createTactic({ id: 'vierge', name: '' }));
    const { container } = render(
      <Board2D labels={labels} tool="zone" zoneShape="ellipse" />
    );
    fireEvent.pointerDown(svg(container), { clientX: 3, clientY: 3 });
    fireEvent.pointerUp(svg(container), { clientX: 3.2, clientY: 3.1 });
    expect(step().zones).toBeUndefined();

    fireEvent.pointerDown(svg(container), { clientX: 9, clientY: 8 });
    fireEvent.pointerMove(svg(container), { clientX: 6, clientY: 5 });
    // L'aperçu se dessine pendant le geste.
    expect(container.querySelectorAll('[data-zone]')).toHaveLength(1);
    fireEvent.pointerMove(svg(container), { clientX: 4, clientY: 2 });
    fireEvent.pointerUp(svg(container), { clientX: 4, clientY: 2 });
    expect(step().zones).toEqual([
      { shape: 'ellipse', x: 4, y: 2, w: 5, h: 6 },
    ]);
  });

  it('« Mot » : un toucher ouvre le champ, Entrée pose le mot ; Échap renonce', () => {
    boardStore.getState().load(createTactic({ id: 'vierge', name: '' }));
    const { container } = render(<Board2D labels={labels} tool="word" />);
    fireEvent.pointerDown(svg(container), { clientX: 12, clientY: 7 });
    fireEvent.pointerUp(svg(container), { clientX: 12, clientY: 7 });
    const field = screen.getByLabelText('Mot à poser');
    expect(field).toHaveFocus();
    fireEvent.change(field, { target: { value: 'Ici on ferme' } });
    fireEvent.submit(field.closest('form')!);
    expect(step().words).toEqual([{ x: 12, y: 7, text: 'Ici on ferme' }]);
    expect(screen.queryByLabelText('Mot à poser')).toBeNull();

    fireEvent.pointerDown(svg(container), { clientX: 5, clientY: 5 });
    fireEvent.pointerUp(svg(container), { clientX: 5, clientY: 5 });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByLabelText('Mot à poser')).toBeNull();
    expect(step().words).toHaveLength(1);
  });

  it('« Mot » : un glisser n’ouvre rien', () => {
    const { container } = render(<Board2D labels={labels} tool="word" />);
    fireEvent.pointerDown(svg(container), { clientX: 5, clientY: 5 });
    fireEvent.pointerMove(svg(container), { clientX: 9, clientY: 5 });
    fireEvent.pointerUp(svg(container), { clientX: 9, clientY: 5 });
    expect(screen.queryByLabelText('Mot à poser')).toBeNull();
  });
});

describe('la barre d’outils', () => {
  const toolbar = (tool: 'select' | 'zone') =>
    render(
      <I18nProvider>
        <BoardToolbar
          view="2d"
          onView={() => {}}
          allowBoth={false}
          show2d
          show3d={false}
          tool={tool}
          onTool={() => {}}
          camera="tribune"
          onCamera={() => {}}
          zoneShape="rect"
          onZoneShape={() => {}}
        />
      </I18nProvider>
    );

  it('« Zone » et « Mot » à côté des flèches ; la forme ne paraît qu’avec « Zone »', () => {
    toolbar('select');
    expect(screen.getByRole('tab', { name: 'Zone' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Mot' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: 'Forme de la zone' })).toBe(
      null
    );
    cleanup();
    toolbar('zone');
    expect(
      screen.getByRole('tab', { name: 'Rectangle', selected: true })
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ellipse' })).toBeInTheDocument();
  });
});

describe('l’onglet « Étape »', () => {
  const panel = () =>
    render(
      <I18nProvider>
        <StepMarks />
      </I18nProvider>
    );

  it('liste zones et mots, les modifie et les supprime', () => {
    panel();
    fireEvent.change(screen.getByLabelText('Forme de la zone 1'), {
      target: { value: 'ellipse' },
    });
    expect(step().zones![0]!.shape).toBe('ellipse');
    fireEvent.change(screen.getByLabelText('Étiquette de la zone 2'), {
      target: { value: 'Pressing' },
    });
    expect(step().zones![1]!.label).toBe('Pressing');
    fireEvent.click(
      screen.getByRole('button', { name: 'Supprimer la zone 1' })
    );
    expect(step().zones).toHaveLength(1);

    const word = screen.getByLabelText('Mot 1');
    fireEvent.change(word, { target: { value: 'On ferme' } });
    expect(step().words![0]!.text).toBe('On ferme');
    // Vidé, le mot garde son texte, et le champ le reprend en sortant.
    fireEvent.change(word, { target: { value: '' } });
    expect(step().words![0]!.text).toBe('On ferme');
    fireEvent.blur(word);
    expect(word).toHaveValue('On ferme');
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer le mot 1' }));
    expect(step().words).toBeUndefined();
  });

  it('ne dit rien quand l’étape n’a ni zone ni mot', () => {
    boardStore.getState().load(createTactic({ id: 'vierge', name: '' }));
    const { container } = panel();
    expect(container).toBeEmptyDOMElement();
  });
});
