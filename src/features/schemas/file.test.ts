import { describe, expect, it } from 'vitest';
import { parseTacticFile, toTacticFile } from './file.ts';
import { createTactic } from '../board/model.ts';

const tactic = createTactic({
  id: 'a',
  name: 'Défense en zone',
  now: '2026-11-17T00:00:00Z',
});

describe('le fichier d’un schéma', () => {
  it('se relit à l’identique', () => {
    const json = JSON.parse(JSON.stringify(toTacticFile(tactic)));
    expect(parseTacticFile(json)).toEqual(tactic);
  });

  it('refuse le fichier d’une autre application', () => {
    expect(() => parseTacticFile({ v: 1, data: { notes: [] } })).toThrow(
      /ne vient pas de Mister UWH Tactic/
    );
  });

  it('refuse une version inconnue', () => {
    expect(() => parseTacticFile({ ...toTacticFile(tactic), v: 9 })).toThrow(
      /version/
    );
  });

  it('refuse un schéma abîmé', () => {
    const broken = toTacticFile({ ...tactic, steps: [] });
    expect(() => parseTacticFile(broken)).toThrow(/invalide/);
  });
});
