import { settleTactic } from './carry.ts';
import { settleCurves } from './curve.ts';
import {
  LINE_NAME_MAX,
  MAX_LINE_STEPS,
  MAX_VARIANTS,
  type Step,
  type Tactic,
  type Variant,
} from './model.ts';

/**
 * LES VARIANTES (ADR 0027) : « si leur 2 monte, on passe par la gauche ;
 * sinon, le relais au fond ».
 *
 * UN DOCUMENT, DES LIGNES. Le schéma enregistré — le DOCUMENT — porte la
 * ligne principale (`steps`) et ses variantes ; chaque variante part d'une
 * étape de la principale (`from`) et continue par les siennes. Une LIGNE se
 * lit aplatie : les étapes communes, puis celles de la variante. C'est
 * elle que le magasin expose comme `tactic` : `frameAt`, l'apnée, les
 * contrôles, la 3D, la vidéo, l'impression et « À toi de jouer » la lisent
 * sans rien savoir des variantes.
 *
 * UNE RETOUCHE S'ÉCRIT À SA PLACE (`writeLine`) : sur une étape commune,
 * elle va à la ligne principale, et toutes les lignes qui la partagent la
 * voient. Ajouter, retirer ou déplacer une étape passe par les trois
 * fonctions qui savent où tombe la frontière (`insertStep`, `removeStepAt`,
 * `swapSteps`).
 *
 * UN SEUL NIVEAU. Une variante part de la ligne principale, jamais d'une
 * autre variante : deux « et si » imbriqués ne se présentent plus d'un
 * coup d'œil, et la frise ne saurait plus les montrer.
 */

/** Une ligne : `null` pour la principale, l'identifiant d'une variante. */
export type LineId = string | null;

export function variantOf(doc: Tactic, line: LineId): Variant | undefined {
  return line ? doc.variants?.find(v => v.id === line) : undefined;
}

/** La ligne existe-t-elle dans ce document ? La principale, toujours. */
export const hasLine = (doc: Tactic, line: LineId) =>
  line === null || variantOf(doc, line) !== undefined;

/** Le même document, variantes et nom de la principale posés ou retirés. */
function withLines(
  tactic: Tactic,
  variants: Variant[] | undefined,
  mainLine: string | undefined
): Tactic {
  const { variants: _v, mainLine: _m, ...rest } = tactic;
  return {
    ...rest,
    ...(variants && variants.length > 0 ? { variants } : {}),
    ...(mainLine ? { mainLine } : {}),
  };
}

/**
 * LA LIGNE, APLATIE : un schéma ordinaire, sans `variants` ni `mainLine`.
 * Sans variante, c'est le document lui-même — le même objet.
 *
 * Les champs des variantes sont RETIRÉS de la ligne : enregistrée par
 * erreur à la place du document, elle perdrait ses variantes plutôt que de
 * les rattacher à des étapes qui ne sont plus les leurs.
 */
export function lineOf(doc: Tactic, line: LineId): Tactic {
  if (doc.variants === undefined && doc.mainLine === undefined) return doc;
  const { variants: _v, mainLine: _m, ...rest } = doc;
  const variant = variantOf(doc, line);
  if (!variant) return rest;
  return {
    ...rest,
    steps: [...doc.steps.slice(0, variant.from + 1), ...variant.steps],
  };
}

/** L'index de la dernière étape commune avec la principale ; `null` pour elle. */
export function branchOf(doc: Tactic, line: LineId): number | null {
  return variantOf(doc, line)?.from ?? null;
}

/** Le nombre d'étapes de la ligne. */
export function lineLength(doc: Tactic, line: LineId): number {
  const variant = variantOf(doc, line);
  return variant ? variant.from + 1 + variant.steps.length : doc.steps.length;
}

/**
 * Les étapes que deux lignes ont en commun, depuis la première. Passer de
 * l'une à l'autre en deçà ne change pas ce qu'on voit.
 */
export function sharedPrefix(doc: Tactic, a: LineId, b: LineId): number {
  if (a === b) return lineLength(doc, a);
  const fa = branchOf(doc, a);
  const fb = branchOf(doc, b);
  if (fa === null) return fb! + 1;
  if (fb === null) return fa + 1;
  return Math.min(fa, fb) + 1;
}

/**
 * LE DOCUMENT, LA LIGNE RÉÉCRITE par sa version retouchée — le même nombre
 * d'étapes. Les étapes communes vont à la principale ; celles de la
 * variante, à elle. Le nom, le bassin, l'effectif, l'affichage sont ceux de
 * la ligne : ils sont communs à tout le document.
 */
export function writeLine(
  doc: Tactic,
  line: LineId,
  projected: Tactic
): Tactic {
  const variant = variantOf(doc, line);
  if (!variant) {
    return withLines(projected, doc.variants, doc.mainLine);
  }
  const steps = doc.steps.map((step, i) =>
    i <= variant.from ? (projected.steps[i] ?? step) : step
  );
  const own = projected.steps.slice(variant.from + 1);
  const variants = doc.variants!.map(v =>
    v.id === variant.id && own.length > 0 ? { ...v, steps: own } : v
  );
  return withLines({ ...projected, steps }, variants, doc.mainLine);
}

/** Toutes les lignes tiennent-elles en trente étapes ? */
const fits = (main: Step[], variants: Variant[] | undefined) =>
  main.length <= MAX_LINE_STEPS &&
  (variants ?? []).every(v => v.from + 1 + v.steps.length <= MAX_LINE_STEPS);

/**
 * UNE ÉTAPE INSÉRÉE à la position `at` de la ligne. Après l'embranchement
 * d'une variante, elle va à la variante ; avant, à la principale — et
 * chaque variante qui part d'au moins `at` recule d'un cran, pour garder
 * ses étapes communes. `null` si une ligne dépasserait trente étapes.
 */
export function insertStep(
  doc: Tactic,
  line: LineId,
  at: number,
  step: Step
): Tactic | null {
  const variant = variantOf(doc, line);
  if (variant && at > variant.from) {
    const j = at - variant.from - 1;
    const own = [...variant.steps];
    own.splice(j, 0, step);
    const variants = doc.variants!.map(v =>
      v.id === variant.id ? { ...v, steps: own } : v
    );
    if (!fits(doc.steps, variants)) return null;
    return withLines(doc, variants, doc.mainLine);
  }
  const steps = [...doc.steps];
  steps.splice(at, 0, step);
  const variants = doc.variants?.map(v =>
    v.from >= at ? { ...v, from: v.from + 1 } : v
  );
  if (!fits(steps, variants)) return null;
  return withLines({ ...doc, steps }, variants, doc.mainLine);
}

/**
 * L'ÉTAPE `at` RETIRÉE de la ligne. Dans une variante, la dernière de ses
 * étapes retirée retire la variante : il ne reste qu'un morceau de la
 * principale. Dans la principale, une variante qui partait de l'étape
 * retirée part de la précédente. `null` quand la ligne y perdrait sa seule
 * étape commune, ou la principale sa seule étape.
 */
export function removeStepAt(
  doc: Tactic,
  line: LineId,
  at: number
): { doc: Tactic; line: LineId } | null {
  const variant = variantOf(doc, line);
  if (variant && at > variant.from) {
    const j = at - variant.from - 1;
    const own = variant.steps.filter((_, i) => i !== j);
    if (own.length === 0) {
      return { doc: removeVariant(doc, variant.id), line: null };
    }
    const variants = doc.variants!.map(v =>
      v.id === variant.id ? { ...v, steps: own } : v
    );
    return { doc: withLines(doc, variants, doc.mainLine), line };
  }
  if (doc.steps.length <= 1) return null;
  if (variant && variant.from === 0) return null;
  const steps = doc.steps.filter((_, i) => i !== at);
  const variants = doc.variants?.map(v => {
    if (v.from > at) return { ...v, from: v.from - 1 };
    if (v.from === at) return { ...v, from: Math.max(0, at - 1) };
    return v;
  });
  return { doc: withLines({ ...doc, steps }, variants, doc.mainLine), line };
}

/**
 * DEUX ÉTAPES VOISINES ÉCHANGÉES. Une variante reste attachée à la même
 * POSITION : « elle part de l'étape 3 ». Échanger par-dessus un
 * embranchement ferait passer une étape de la variante dans la principale :
 * refusé (`null`).
 */
export function swapSteps(
  doc: Tactic,
  line: LineId,
  a: number,
  b: number
): Tactic | null {
  const variant = variantOf(doc, line);
  const length = lineLength(doc, line);
  if (a < 0 || b < 0 || a >= length || b >= length) return null;
  if (variant) {
    const ownA = a > variant.from;
    if (ownA !== b > variant.from) return null;
    if (ownA) {
      const own = [...variant.steps];
      const i = a - variant.from - 1;
      const j = b - variant.from - 1;
      [own[i], own[j]] = [own[j]!, own[i]!];
      const variants = doc.variants!.map(v =>
        v.id === variant.id ? { ...v, steps: own } : v
      );
      return withLines(doc, variants, doc.mainLine);
    }
  }
  const steps = [...doc.steps];
  [steps[a], steps[b]] = [steps[b]!, steps[a]!];
  return { ...doc, steps };
}

/**
 * UNE TRANSFORMATION DE TOUTES LES ÉTAPES DE TOUTES LES LIGNES : le bassin
 * redimensionné, la phase retournée. `fn` reçoit chaque ligne comme un
 * schéma ordinaire — la principale, puis les étapes propres de chaque
 * variante — et ne doit pas changer leur nombre.
 */
export function mapLines(doc: Tactic, fn: (tactic: Tactic) => Tactic): Tactic {
  const { variants, mainLine, ...rest } = doc;
  const main = fn(rest);
  const next = variants?.map(v => {
    const steps = fn({ ...rest, steps: v.steps }).steps;
    return steps === v.steps ? v : { ...v, steps };
  });
  return withLines(main, next, mainLine);
}

/**
 * LES VARIANTES REMISES EN RÈGLE, comme le palet (`carry.ts`) : chacune part
 * d'une étape qui existe, sa ligne tient en trente étapes, son identifiant
 * est unique, et il n'y en a pas plus de six. Ce qui ne tient pas est
 * raccourci, puis retiré s'il ne reste rien. Le même document si rien ne
 * change.
 */
export function settleVariants(doc: Tactic): Tactic {
  if (!doc.variants) return doc;
  const seen = new Set<string>();
  const kept: Variant[] = [];
  let changed = doc.variants.length === 0;
  for (const v of doc.variants) {
    if (seen.has(v.id) || kept.length >= MAX_VARIANTS) {
      changed = true;
      continue;
    }
    const from = Math.min(v.from, doc.steps.length - 1);
    const room = MAX_LINE_STEPS - from - 1;
    const steps = v.steps.length > room ? v.steps.slice(0, room) : v.steps;
    if (steps.length === 0) {
      changed = true;
      continue;
    }
    seen.add(v.id);
    if (from === v.from && steps === v.steps) {
      kept.push(v);
    } else {
      changed = true;
      kept.push({ ...v, from, steps });
    }
  }
  return changed ? withLines(doc, kept, doc.mainLine) : doc;
}

const settleLine = (tactic: Tactic) => settleCurves(settleTactic(tactic));

/**
 * TOUT LE DOCUMENT REMIS EN RÈGLE après chaque édition : les variantes,
 * puis chaque ligne — le palet au bout de la crosse de son porteur, une
 * nage courbe seulement pour qui bouge. La première étape d'une variante
 * a un départ, l'étape de la principale d'où elle part : ses courbes se
 * jugent sur la ligne aplatie. Le même document si rien ne change.
 */
export function settleDocument(doc: Tactic): Tactic {
  const ordered = settleVariants(doc);
  const main = settleLine(ordered);
  if (!main.variants) return main;
  let changed = main !== ordered;
  const variants = main.variants.map(v => {
    const line = {
      ...main,
      steps: [...main.steps.slice(0, v.from + 1), ...v.steps],
    };
    const settled = settleLine(line);
    if (settled === line) return v;
    const steps = settled.steps.slice(v.from + 1);
    if (steps.every((s, i) => s === v.steps[i])) return v;
    changed = true;
    return { ...v, steps };
  });
  return changed ? { ...main, variants } : ordered;
}

/** Pourquoi une variante ne peut pas naître ici ; `null` si elle le peut. */
export type VariantRefusal = 'nested' | 'full' | 'long';

export function variantRefusal(
  doc: Tactic,
  line: LineId,
  at: number
): VariantRefusal | null {
  const variant = variantOf(doc, line);
  if (variant && at > variant.from) return 'nested';
  if ((doc.variants?.length ?? 0) >= MAX_VARIANTS) return 'full';
  if (at + 2 > MAX_LINE_STEPS) return 'long';
  return null;
}

/**
 * UNE VARIANTE NAÎT DE L'ÉTAPE `at` : sa première étape copie celle-ci,
 * comme une étape ajoutée — sans consigne ni flèches. On ne raconte pas
 * l'autre suite en replaçant tout le monde. Rend le document et la ligne
 * de la variante, ou `null` (`variantRefusal`).
 */
export function addVariant(
  doc: Tactic,
  line: LineId,
  at: number,
  id: string
): { doc: Tactic; line: string } | null {
  if (variantRefusal(doc, line, at) !== null) return null;
  const origin = doc.steps[at];
  if (!origin) return null;
  const copy = structuredClone(origin);
  copy.note = '';
  copy.arrows = [];
  const variant: Variant = { id, name: '', from: at, steps: [copy] };
  return {
    doc: withLines(doc, [...(doc.variants ?? []), variant], doc.mainLine),
    line: id,
  };
}

/** La ligne renommée ; la principale sans nom reprend « Ligne principale ». */
export function renameLine(doc: Tactic, line: LineId, name: string): Tactic {
  const clipped = name.slice(0, LINE_NAME_MAX);
  if (line === null) {
    return withLines(doc, doc.variants, clipped || undefined);
  }
  const variants = doc.variants?.map(v =>
    v.id === line ? { ...v, name: clipped } : v
  );
  return withLines(doc, variants, doc.mainLine);
}

/**
 * La variante retirée. Avec la dernière part aussi le nom de la principale :
 * un schéma sans variante redevient exactement ce qu'il était.
 */
export function removeVariant(doc: Tactic, id: string): Tactic {
  const variants = doc.variants?.filter(v => v.id !== id);
  return variants && variants.length > 0
    ? withLines(doc, variants, doc.mainLine)
    : withLines(doc, undefined, undefined);
}

/** Les lignes du document, la principale d'abord, dans l'ordre de la frise. */
export function linesOf(
  doc: Tactic
): { id: LineId; name: string; from: number | null; index: number }[] {
  return [
    { id: null, name: doc.mainLine ?? '', from: null, index: 0 },
    ...(doc.variants ?? []).map((v, i) => ({
      id: v.id,
      name: v.name,
      from: v.from,
      index: i + 1,
    })),
  ];
}

/**
 * LES EMBRANCHEMENTS QUE LA LIGNE TRAVERSE : les étapes d'où part une autre
 * suite. Sur la principale, celles de toutes les variantes ; sur une
 * variante, la sienne et celles des variantes qui partent avant elle.
 */
export function forksOn(doc: Tactic, line: LineId): Set<number> {
  const own = branchOf(doc, line);
  const forks = new Set<number>();
  for (const v of doc.variants ?? []) {
    if (own === null || v.from <= own) forks.add(v.from);
  }
  return forks;
}

/**
 * À L'ÉTAPE `at`, LES SUITES POSSIBLES : la principale et les variantes qui
 * en partent. `current` est celle que la ligne prend — la principale tant
 * qu'une variante n'a pas encore quitté les étapes communes. `null` hors
 * d'un embranchement.
 */
export function forkAt(
  doc: Tactic,
  line: LineId,
  at: number
): { options: LineId[]; current: LineId } | null {
  const own = branchOf(doc, line);
  if (own !== null && at > own) return null;
  const hanging = (doc.variants ?? []).filter(v => v.from === at);
  if (hanging.length === 0) return null;
  return {
    options: [null, ...hanging.map(v => v.id)],
    current: own === at ? line : null,
  };
}

/**
 * LA TÉLÉCOMMANDE PARCOURT TOUTES LES SUITES : au bout d'une ligne,
 * « suivant » revient à l'embranchement de la ligne d'après, dans l'ordre
 * de la frise. `null` au bout de la dernière.
 */
export function tourNext(
  doc: Tactic,
  line: LineId
): { line: string; step: number } | null {
  const lines = linesOf(doc);
  const index = lines.findIndex(l => l.id === line);
  if (index < 0) return null;
  const next = lines[index + 1];
  if (!next || next.id === null || next.from === null) return null;
  return { line: next.id, step: next.from };
}
