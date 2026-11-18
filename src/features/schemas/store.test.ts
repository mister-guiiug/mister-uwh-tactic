import { afterEach, describe, expect, it, vi } from 'vitest';
import { backend } from '../../backend/index.ts';
import { syncOnReconnect, useSchemas } from './store.ts';

afterEach(() => {
  vi.restoreAllMocks();
  useSchemas.setState({ schemas: [], ready: false, error: null });
});

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
