import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

/**
 * « APPLIQUER MON EFFECTIF ? », PROPOSÉ SANS RIEN IMPOSER (ADR 0028) : quand
 * un schéma arrive au tableau — un exemple, un schéma d'un carnet reçu, un
 * lien partagé, un schéma neuf —, une carte offre de poser ses prénoms d'un
 * geste. Un bouton, pas une boîte de dialogue : on peut l'ignorer et jouer.
 *
 * Ce module est tout ce que l'accueil porte de l'effectif : l'identifiant du
 * schéma à qui l'offre s'adresse. La carte, l'effectif et sa validation
 * viennent avec le morceau secondaire (`panels/secondary.ts`). Un autre
 * schéma ouvert, et l'offre ne le suit pas ; un rechargement l'oublie.
 */
const offer = createStore<{ id: string | null }>(() => ({ id: null }));

/** Propose l'effectif au schéma `id`, s'il a de quoi le changer. */
export const offerEffectif = (id: string) => offer.setState({ id });

export const dismissEffectifOffer = () => offer.setState({ id: null });

/** L'identifiant du schéma à qui l'effectif est proposé, ou `null`. */
export const useEffectifOffer = () => useStore(offer, state => state.id);
