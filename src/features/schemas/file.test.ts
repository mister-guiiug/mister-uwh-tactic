import { describe, expect, it } from 'vitest';
import {
  parseTacticFile,
  parseTacticFiles,
  toLibraryFile,
  toTacticFile,
} from './file.ts';
import { createTactic, visiblePlayers } from '../board/model.ts';
import { tacticV1 } from '../board/fixtures.ts';

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

  it('relit un fichier de la version 1, remplaçants masqués', () => {
    const file = { app: 'mister-uwh-tactic', v: 1, tactic: tacticV1() };
    const tactic = parseTacticFile(JSON.parse(JSON.stringify(file)));
    expect(tactic.roster.players).toHaveLength(20);
    expect(visiblePlayers(tactic)).toHaveLength(11);
  });

  it('refuse un schéma abîmé', () => {
    const broken = toTacticFile({ ...tactic, steps: [] });
    expect(() => parseTacticFile(broken)).toThrow(/invalide/);
  });
});

describe('le fichier de la bibliothèque', () => {
  const autre = { ...tactic, id: 'b', name: 'Sortie de but' };

  it('rend tous les schémas, et un fichier d’un seul schéma aussi', () => {
    expect(parseTacticFiles(toLibraryFile([tactic, autre]))).toEqual({
      tactics: [tactic, autre],
      rejected: 0,
    });
    expect(parseTacticFiles(toTacticFile(tactic))).toEqual({
      tactics: [tactic],
      rejected: 0,
    });
  });

  it('écarte un schéma abîmé sans perdre les autres', () => {
    const file = toLibraryFile([tactic, { ...autre, steps: [] }]);
    expect(parseTacticFiles(file)).toEqual({ tactics: [tactic], rejected: 1 });
  });

  it('refuse une bibliothèque d’une autre application, ou sans rien de lisible', () => {
    expect(() =>
      parseTacticFiles({ ...toLibraryFile([tactic]), app: 'miss-genius' })
    ).toThrow(/Mister UWH Tactic/);
    expect(() =>
      parseTacticFiles(toLibraryFile([{ ...tactic, steps: [] }]))
    ).toThrow(/aucun schéma/);
  });
});
