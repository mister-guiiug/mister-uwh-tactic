import { create } from 'zustand';
import { createVersionedStore } from '@mister-guiiug/dev-pwa-config/versioned-store';
import { clamp, SQUAD_SIZE, type Team } from '../board/model.ts';
import {
  EFFECTIF_VERSION,
  effectifSchema,
  emptyEffectif,
  MEMBER_NAME_MAX,
  type Effectif,
  type Member,
} from './model.ts';

/**
 * L'EFFECTIF VIT SUR L'APPAREIL, comme le bassin du club et le mode du
 * tableau : pas au compte (ADR 0028). Clé préfixée par l'application, préfixe
 * et clé collés comme le veut le socle (`mister-uwh-tacticeffectif`) : toutes
 * les apps du parc partagent la même origine, donc le même `localStorage`.
 */
export const effectifStore = createVersionedStore<Effectif>({
  store: 'mister-uwh-tactic',
  key: 'effectif',
  version: EFFECTIF_VERSION,
  validate: data => effectifSchema.parse(data),
  seed: emptyEffectif,
});

/** Ce qu'on change d'un numéro ; `apnea: null` rend le seuil du schéma. */
export type MemberPatch = Partial<Omit<Member, 'apnea'>> & {
  apnea?: number | null;
};

interface EffectifState {
  effectif: Effectif;
  /** Le prénom, la main ou l'apnée d'un numéro (1 à 10) d'une équipe. */
  setMember: (team: Team, number: number, patch: MemberPatch) => void;
  /** Tout l'effectif d'un coup : garder depuis un schéma, annuler, vider. */
  replace: (effectif: Effectif) => void;
}

/**
 * L'ÉTAT VIVANT DE L'EFFECTIF (ADR 0002) : Zustand pour l'écran, le magasin
 * versionné pour ce qui survit. Chaque changement s'écrit aussitôt — une
 * liste de dix prénoms, pas un glisser à soixante images par seconde.
 */
export const useEffectif = create<EffectifState>()(set => {
  const write = (effectif: Effectif) => {
    effectifStore.save(effectif);
    set({ effectif });
  };
  return {
    effectif: effectifStore.load(),

    setMember: (team, number, patch) =>
      set(state => {
        if (!Number.isInteger(number) || number < 1 || number > SQUAD_SIZE) {
          return {};
        }
        const before = state.effectif[team][number - 1]!;
        const { apnea: _was, ...rest } = before;
        const apnea =
          patch.apnea === undefined
            ? before.apnea
            : patch.apnea === null || !Number.isFinite(patch.apnea)
              ? undefined
              : clamp(Math.round(patch.apnea), 5, 60);
        const member: Member = {
          ...rest,
          ...(patch.name === undefined
            ? {}
            : { name: patch.name.slice(0, MEMBER_NAME_MAX) }),
          ...(patch.leftHanded === undefined
            ? {}
            : { leftHanded: patch.leftHanded }),
          ...(apnea === undefined ? {} : { apnea }),
        };
        const effectif = {
          ...state.effectif,
          [team]: state.effectif[team].map((m, i) =>
            i === number - 1 ? member : m
          ),
        };
        effectifStore.save(effectif);
        return { effectif };
      }),

    replace: effectif => write(effectifSchema.parse(effectif)),
  };
});
