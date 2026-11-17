import { describe, expect, it } from 'vitest';
import {
  decodeTactic,
  encodeTactic,
  sharedCodeFromHash,
  shareUrl,
} from './share.ts';
import { createTactic, playerId, refereeId } from './model.ts';

const meta = { id: 'nouveau', now: '2026-11-18T00:00:00Z' };

function sample() {
  const t = createTactic({
    id: 'origine',
    name: 'Sortie de but « 2-3-1 »',
    now: '2026-11-17T00:00:00Z',
  });
  t.roster.players[0]!.name = 'Loïc';
  t.roster.players[0]!.leftHanded = true;
  t.roster.referees[2]!.name = 'Arbitre chef';
  t.counts = { blanc: 5, noir: 6, referees: 3 };
  t.display = { fieldOfView: true, refereeLine: '1-3', labels: false };
  const second = structuredClone(t.steps[0]!);
  second.poses[playerId('blanc', 1)] = {
    x: 8.24,
    y: 6.06,
    angle: 37,
    surface: false,
  };
  second.poses[refereeId(3)] = { x: 14, y: 1, angle: 95 };
  second.puck = { x: 9.1, y: 6.2 };
  second.note = 'Le pivot monte, l’ailier couvre';
  t.steps.push(second);
  return t;
}

describe('le lien de partage', () => {
  it('rend le même schéma, positions au décimètre près', () => {
    const original = sample();
    const back = decodeTactic(encodeTactic(original), meta);
    expect(back.id).toBe('nouveau');
    expect(back.name).toBe(original.name);
    expect(back.counts).toEqual(original.counts);
    expect(back.display).toEqual(original.display);
    expect(back.roster.players[0]).toMatchObject({
      name: 'Loïc',
      leftHanded: true,
    });
    expect(back.roster.referees[2]!.name).toBe('Arbitre chef');
    expect(back.steps).toHaveLength(2);
    expect(back.steps[1]!.poses[playerId('blanc', 1)]).toEqual({
      x: 8.2,
      y: 6.1,
      angle: 37,
      surface: false,
    });
    expect(back.steps[1]!.poses[refereeId(3)]).toEqual({
      x: 14,
      y: 1,
      angle: 95,
    });
    expect(back.steps[1]!.note).toBe('Le pivot monte, l’ailier couvre');
  });

  it('tient dans un message : moins de 3 ko pour deux étapes', () => {
    expect(encodeTactic(sample()).length).toBeLessThan(3000);
  });

  it('n’emploie que des caractères sûrs dans une adresse', () => {
    expect(encodeTactic(sample())).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('refuse un lien tronqué', () => {
    const code = encodeTactic(sample());
    expect(() => decodeTactic(code.slice(0, code.length / 2), meta)).toThrow();
  });

  it('lit le fragment, et seulement le sien', () => {
    expect(sharedCodeFromHash('#s=abc')).toBe('abc');
    expect(sharedCodeFromHash('#autre')).toBeNull();
    expect(shareUrl(sample(), 'https://x.test/app/')).toMatch(
      /^https:\/\/x\.test\/app\/#s=/
    );
  });
});
