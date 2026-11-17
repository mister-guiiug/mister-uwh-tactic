import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalBackend } from './local.ts';
import { createTactic } from '../features/board/model.ts';

const make = (id: string, name: string) =>
  createTactic({ id, name, now: '2026-11-17T00:00:00Z' });

beforeEach(() => localStorage.clear());

describe('le port des schémas, en local', () => {
  it('enregistre, remplace par identifiant, et supprime', async () => {
    const { schemas } = createLocalBackend();
    await schemas.save(make('a', 'Premier'));
    await schemas.save(make('b', 'Second'));
    await schemas.save(make('a', 'Premier, revu'));
    const list = await schemas.list();
    expect(list.map(s => s.name)).toEqual(['Premier, revu', 'Second']);
    await schemas.remove('b');
    expect((await schemas.list()).map(s => s.id)).toEqual(['a']);
  });

  it('vit sous sa propre clé, préfixée par l’application', async () => {
    const { schemas } = createLocalBackend();
    await schemas.save(make('a', 'Premier'));
    const keys = Object.keys(localStorage);
    expect(
      keys.some(k => k.startsWith('mister-uwh-tactic') && k.includes('schemas'))
    ).toBe(true);
  });
});
