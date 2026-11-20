import { describe, expect, it } from 'vitest';
import {
  frameDue,
  frameTimestamp,
  LEAD_SECONDS,
  phaseTimeline,
  TAIL_SECONDS,
  VIDEO_FPS,
  VIDEO_MAX_SECONDS,
} from './timeline.ts';

describe('le temps du clip', () => {
  it('dure la phase à vitesse réelle, plus les deux tenues', () => {
    // Trois étapes : deux passages de 4 et 2 s ; la dernière durée ne
    // compte pas, elle n'a pas de suite.
    const timeline = phaseTimeline([4, 2, 9], { fps: 30 });
    expect(timeline.speed).toBe(1);
    expect(timeline.seconds).toBe(LEAD_SECONDS + 4 + 2 + TAIL_SECONDS);
    expect(timeline.frames).toBe(timeline.seconds * 30);
  });

  it('tient la première étape, puis suit les durées des étapes', () => {
    const timeline = phaseTimeline([4, 2, 5], { fps: 10 });
    const at = (seconds: number) => timeline.playheadAt(seconds * 10);
    expect(at(0)).toBe(0);
    expect(at(LEAD_SECONDS)).toBe(0);
    // À mi-chemin du premier passage (4 s) : la tête est à 0,5.
    expect(at(LEAD_SECONDS + 2)).toBeCloseTo(0.5);
    // Le second passage dure 2 s : une seconde en fait la moitié.
    expect(at(LEAD_SECONDS + 4)).toBeCloseTo(1);
    expect(at(LEAD_SECONDS + 5)).toBeCloseTo(1.5);
    // Puis la dernière étape, tenue jusqu'à la fin.
    expect(at(LEAD_SECONDS + 6)).toBe(2);
    expect(timeline.playheadAt(timeline.frames - 1)).toBe(2);
  });

  it('ne recule jamais d’une image à la suivante', () => {
    const timeline = phaseTimeline([3, 1, 7, 2]);
    let previous = -1;
    for (let i = 0; i < timeline.frames; i += 1) {
      const playhead = timeline.playheadAt(i);
      expect(playhead).toBeGreaterThanOrEqual(previous);
      previous = playhead;
    }
    expect(previous).toBe(3);
  });

  it('au-delà du plafond, accélère la phase au lieu de la couper', () => {
    // Trente étapes d'une minute : une demi-heure de jeu.
    const timeline = phaseTimeline(Array<number>(30).fill(60));
    expect(timeline.seconds).toBeCloseTo(VIDEO_MAX_SECONDS);
    expect(timeline.speed).toBeCloseTo(
      (29 * 60) / (VIDEO_MAX_SECONDS - LEAD_SECONDS - TAIL_SECONDS)
    );
    // Toute la phase y est : la dernière étape est atteinte avant la fin.
    expect(timeline.playheadAt(timeline.frames - 1)).toBe(29);
    expect(
      timeline.playheadAt((VIDEO_MAX_SECONDS - TAIL_SECONDS) * VIDEO_FPS)
    ).toBe(29);
  });

  it('une étape seule donne une image tenue', () => {
    const timeline = phaseTimeline([5]);
    expect(timeline.seconds).toBe(LEAD_SECONDS + TAIL_SECONDS);
    expect(timeline.playheadAt(10)).toBe(0);
  });
});

describe('l’instant de chaque image', () => {
  it('se calcule depuis l’index, sans dérive', () => {
    expect(frameTimestamp(0, 30)).toBe(0);
    expect(frameTimestamp(1, 30)).toBe(33_333);
    expect(frameTimestamp(2, 30)).toBe(66_667);
    // 1 800 images plus loin : pile une minute, pas 1 800 arrondis cumulés.
    expect(frameTimestamp(1_800, 30)).toBe(60_000_000);
  });

  it('le repli dessine l’image que l’horloge attend', () => {
    expect(frameDue(0, 30)).toBe(0);
    expect(frameDue(33, 30)).toBe(0);
    expect(frameDue(34, 30)).toBe(1);
    // Un rendu de 200 ms saute six images : la phase ne ralentit pas.
    expect(frameDue(1_200, 30)).toBe(36);
    expect(frameDue(-5, 30)).toBe(0);
  });
});
