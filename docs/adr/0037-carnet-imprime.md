# 0037 — Le carnet imprimé

## Contexte

Le carnet de jeu (ADR 0023) envoie une sélection de schémas en un lien. Au
bord du bassin, et pour les plus jeunes joueurs, le papier reste ce qui se
lit sans téléphone : on plastifie, on affiche au vestiaire. La fiche d'une
phase s'imprimait déjà, la séance aussi (ADR 0018), mais pas la sélection.

## Décision

**« Imprimer » dans la barre de sélection de la bibliothèque**, à côté de
« Partager la sélection ».

- Une phase par page : son nom, la vue d'ensemble de ses nages (ADR 0036)
  quand elle a plusieurs étapes, puis une vignette par étape, deux par rangée,
  avec sa consigne, ou l'étape racontée quand elle est vide (ADR 0030).
- L'ordre est celui de la liste, comme le carnet partagé.
- La feuille vit dans le morceau du carnet (`carnet/parts.ts`), déjà chargé
  par la barre de sélection : l'impression n'attend rien, et l'accueil ne
  porte rien de plus.
- La mécanique « monter, imprimer, démonter » est celle de la phase et de la
  séance (`app/usePrinting.ts`).

## Écarté

- **Un PDF fabriqué par l'application** : le dialogue d'impression du
  navigateur sait déjà « Enregistrer en PDF », sur tous les appareils.
