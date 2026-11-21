# 0035 — Le lien « pour les joueurs »

## Contexte

Un entraîneur envoie ses phases aux joueurs : un lien, un QR code au bord du
bassin, le carnet. Jusqu'ici, le lien d'un schéma ouvrait l'**éditeur** :
outils, panneau, enregistrement, alors que le joueur veut seulement **voir**
la phase, la tourner étape par étape, et la rejouer (« À toi de jouer »,
ADR 0022).

## Décision

**Un second lien, qui s'ouvre en présentation.**

- Il porte des clés à lui, `#sp=` lisible et `#zp=` compressé, et le même
  schéma que `#s=` / `#z=`. Un tableau d'avant ne les connaît pas : il ne
  s'ouvre pas à moitié.
- À l'arrivée, le schéma est chargé comme tout lien. La présentation est
  demandée par le même chemin qu'une séance (`state.present`) : plein écran
  quand le navigateur l'accorde, écran allumé, balayage pour tourner les
  pages. Un jeton ne s'y saisit pas.
- L'effectif n'y est pas proposé (ADR 0028) : c'est un joueur qui reçoit.
- Au menu « ⋯ » : « Lien pour les joueurs », à côté du lien ordinaire. Il
  est lisible, donc synchrone : la feuille de partage du téléphone s'ouvre
  dans le geste. La feuille du QR code choisit ce qu'il ouvre, « Pour
  modifier » ou « Pour les joueurs » : c'est le QR qu'on affiche au bord du
  bassin.

## Conséquences

- En quittant la présentation, le joueur trouve le tableau. Rien ne l'empêche
  de modifier sa copie : le lien ne verrouille pas, il oriente.
- Un même schéma a deux adresses ; le carnet et la séance gardent leurs
  propres liens.
