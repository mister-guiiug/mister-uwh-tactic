import { describe, expect, it } from 'vitest';
import {
  elapsed,
  endsAt,
  formatClock,
  freshClock,
  pauseClock,
  resumeClock,
  timeLeft,
} from './clock.ts';

const T0 = 1_000_000;

describe('le chronomètre', () => {
  it('décompte depuis le départ', () => {
    const clock = freshClock(T0);
    expect(timeLeft(clock, 5, T0)).toBe(300_000);
    expect(timeLeft(clock, 5, T0 + 61_000)).toBe(239_000);
  });

  it('passe en négatif une fois le temps dépassé', () => {
    expect(timeLeft(freshClock(T0), 1, T0 + 72_000)).toBe(-12_000);
  });

  it('ne compte pas le temps passé en pause', () => {
    let clock = freshClock(T0);
    clock = pauseClock(clock, T0 + 10_000);
    // En pause, le temps est figé, quel que soit l'instant.
    expect(timeLeft(clock, 1, T0 + 50_000)).toBe(50_000);
    clock = resumeClock(clock, T0 + 40_000);
    expect(clock.pausedFor).toBe(30_000);
    expect(timeLeft(clock, 1, T0 + 45_000)).toBe(45_000);
  });

  it('ignore une pause ou une reprise répétée', () => {
    const paused = pauseClock(freshClock(T0), T0 + 1_000);
    expect(pauseClock(paused, T0 + 9_000)).toBe(paused);
    const running = freshClock(T0);
    expect(resumeClock(running, T0 + 9_000)).toBe(running);
  });

  it('ne fait pas gagner de temps à un instant relevé avant le départ', () => {
    expect(timeLeft(freshClock(T0), 5, T0 - 800)).toBe(300_000);
  });

  it('compte le temps couru, pauses ôtées', () => {
    let clock = freshClock(T0);
    clock = pauseClock(clock, T0 + 10_000);
    expect(elapsed(clock, T0 + 99_000)).toBe(10_000);
    clock = resumeClock(clock, T0 + 40_000);
    expect(elapsed(clock, T0 + 45_000)).toBe(15_000);
    expect(elapsed(freshClock(T0), T0 - 500)).toBe(0);
  });

  it('dit l’instant de la fin, pas celui où on la relève', () => {
    let clock = freshClock(T0);
    expect(endsAt(clock, 10)).toBe(T0 + 600_000);
    // Trente secondes de pause repoussent la fin d'autant.
    clock = resumeClock(pauseClock(clock, T0 + 60_000), T0 + 90_000);
    expect(endsAt(clock, 10)).toBe(T0 + 630_000);
    // L'écran réveillé dix minutes plus tard lit la même fin.
    expect(timeLeft(clock, 10, T0 + 1_230_000)).toBe(-600_000);
    expect(endsAt(clock, 10)).toBe(T0 + 630_000);
  });

  it('s’écrit en minutes et secondes, puis en dépassement', () => {
    expect(formatClock(300_000)).toBe('5:00');
    expect(formatClock(244_200)).toBe('4:05');
    expect(formatClock(400)).toBe('0:01');
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(-12_400)).toBe('+0:12');
    expect(formatClock(-61_000)).toBe('+1:01');
  });
});
