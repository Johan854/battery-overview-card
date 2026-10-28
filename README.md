# Battery Overview Card (FR)

Carte Home Assistant qui regroupe les niveaux de batterie de tes capteurs : tri du plus faible au plus fort, barres colorées, résumé « batteries faibles », appareils hors ligne signalés et détection automatique possible. Style verre, thème clair/sombre automatique, éditeur visuel, textes en français.

## Installation (HACS)
1. HACS → ⋮ → *Dépôts personnalisés* → `https://github.com/Johan854/battery-overview-card`, catégorie **Tableau de bord**.
2. Installer, puis recharger le navigateur.

## Exemple
```yaml
type: custom:battery-overview-card
title: Batteries
low_threshold: 20          # orange sous ce seuil
critical_threshold: 10     # rouge sous ce seuil
sort: level                # level | name | manual
only_low: false            # n'afficher que les batteries faibles
auto_discover: false       # détecte les capteurs avec device_class: battery
exclude: ""                # mots à exclure en détection automatique
entities:
  - { entity: sensor.porte_buanderie_batterie, name: Porte buanderie }
  - { entity: sensor.temperature_cuisine_batterie, name: Cuisine }
```
Les capteurs binaires de batterie faible (on/off) sont aussi pris en charge.

## Apparence : nuance de couleur

Dans l'éditeur visuel, à côté du thème :

| Option | Valeurs |
|---|---|
| `nuance` | `theme` (par défaut), `braise`, `ocean`, `lagon`, `foret`, `lavande`, `framboise`, `ambre`, `ardoise`, `perso` |
| `nuance_perso` | Couleur au choix (sélecteur de couleur), utilisée avec `nuance: perso` |
| `intensite` | De `0` (neutre) à `2` (très coloré), `1` par défaut |

La nuance teinte le dégradé de fond (et la couleur d'accent quand la carte en a une). Les couleurs d'état (vert, orange, rouge…) ne changent pas.

**Une seule nuance pour toutes les cartes Johan854** : laisse `nuance: theme` et ajoute à ton thème Home Assistant :

```yaml
carte-nuance: "#2f8fd8"
```

Sans cette ligne, `nuance: theme` garde les couleurs d'origine de la carte.

## Historique des versions

- **1.1.0** : nuance de couleur au choix (8 nuances, couleur personnalisée, intensité, ou nuance commune via `carte-nuance` dans le thème).
