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
