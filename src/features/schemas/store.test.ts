import { afterEach, describe, expect, it, vi } from 'vitest';
import { backend } from '../../backend/index.ts';
import { onAuthEvent } from '../../auth/index.ts';
import { createTactic, type Tactic } from '../board/model.ts';
import { syncOnReconnect, useSchemas } from './store.ts';

afterEach(() => {
  vi.restoreAllMocks();
  useSchemas.setState({ schemas: [], outside: [], ready: false, error: null });
});

const schema = (id: string, name: string): Tactic =>
  createTactic({ id, name, now: '2026-11-18T08:00:00.000Z' });

describe('la bibliothèque au retour du réseau', () => {
  it('se relit — et envoie ce qui attendait — une fois déjà lue', async () => {
    const list = vi.spyOn(backend.schemas, 'list').mockResolvedValue([]);
    const target = new EventTarget() as unknown as Window;
    const stop = syncOnReconnect(target);

    target.dispatchEvent(new Event('online'));
    expect(list).not.toHaveBeenCalled();

    useSchemas.setState({ ready: true });
    target.dispatchEvent(new Event('online'));
    expect(list).toHaveBeenCalledTimes(1);

    stop();
    target.dispatchEvent(new Event('online'));
    expect(list).toHaveBeenCalledTimes(1);
  });
});

describe('la bibliothèque suit le compte (ADR 0015)', () => {
  it('se relit à l’entrée et à la sortie d’un compte, pas au renouvellement du jeton', () => {
    const list = vi.spyOn(backend.schemas, 'list').mockResolvedValue([]);
    useSchemas.setState({ ready: true });

    onAuthEvent('TOKEN_REFRESHED');
    expect(list).not.toHaveBeenCalled();

    onAuthEvent('SIGNED_OUT');
    onAuthEvent('SIGNED_IN');
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('pas encore lue, elle ne se lit pas pour autant', () => {
    const list = vi.spyOn(backend.schemas, 'list').mockResolvedValue([]);
    onAuthEvent('SIGNED_OUT');
    expect(list).not.toHaveBeenCalled();
  });

  it('une lecture dépassée ne remet pas à l’écran les schémas du compte parti', async () => {
    let rendreAlice: (liste: Tactic[]) => void = () => {};
    vi.spyOn(backend.schemas, 'list')
      .mockImplementationOnce(
        () => new Promise<Tactic[]>(resolve => (rendreAlice = resolve))
      )
      .mockResolvedValueOnce([schema('d', 'de l’appareil')]);
    vi.spyOn(backend.schemas, 'outside').mockResolvedValue([]);

    const lectureAlice = useSchemas.getState().load();
    await useSchemas.getState().load();
    rendreAlice([schema('a', 'à Alice')]);
    await lectureAlice;

    expect(useSchemas.getState().schemas.map(s => s.id)).toEqual(['d']);
  });

  it('lit aussi ce qui est resté hors du compte', async () => {
    vi.spyOn(backend.schemas, 'list').mockResolvedValue([schema('a', 'A')]);
    vi.spyOn(backend.schemas, 'outside').mockResolvedValue([schema('d', 'D')]);

    await useSchemas.getState().load();

    expect(useSchemas.getState().outside.map(s => s.id)).toEqual(['d']);
  });

  it('« Ajouter à mon compte » relit, et dit ce que la base a refusé', async () => {
    const adopt = vi.spyOn(backend.schemas, 'adopt').mockResolvedValue({
      adopted: 1,
      refused: [{ id: 'e', message: 'refusé par la base' }],
    });
    vi.spyOn(backend.schemas, 'list').mockResolvedValue([schema('d', 'D')]);
    vi.spyOn(backend.schemas, 'outside').mockResolvedValue([schema('e', 'E')]);

    await expect(useSchemas.getState().adopt(['d', 'e'])).resolves.toBe(1);

    expect(adopt).toHaveBeenCalledWith(['d', 'e']);
    const { schemas, outside, error } = useSchemas.getState();
    expect(schemas.map(s => s.id)).toEqual(['d']);
    expect(outside.map(s => s.id)).toEqual(['e']);
    expect(error).toBe('refusé par la base');
  });

  it('enregistrer un schéma venu de l’appareil le retire de « hors du compte »', async () => {
    vi.spyOn(backend.schemas, 'save').mockResolvedValue();
    useSchemas.setState({ outside: [schema('d', 'D')] });

    await useSchemas.getState().save(schema('d', 'D, retouché'));

    expect(useSchemas.getState().outside).toEqual([]);
  });
});
