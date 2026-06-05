# GapTrack — Plateforme d’audit GRC/SSI

**GapTrack** est une application web permettant de réaliser un audit de maturité cybersécurité, de suivre les écarts, d’associer des preuves et de générer un plan d’action priorisé.

Ce projet a été conçu dans une logique de **GRC cybersécurité** afin de simuler une mission d’audit SSI : évaluation de contrôles, scoring de maturité, identification des écarts, priorisation des remédiations et restitution exploitable.

🔗 **Démo en ligne** : https://gaptrack-ssi.vercel.app/  
🔗 **Code source** : https://github.com/JulienMessaoudi/GapTrack

---

## Sommaire

- [Contexte du projet](#contexte-du-projet)
- [Objectifs](#objectifs)
- [Fonctionnalités principales](#fonctionnalités-principales)
- [Approche GRC / SSI](#approche-grc--ssi)
- [Scoring de maturité](#scoring-de-maturité)
- [Cas d’usage](#cas-dusage)
- [Aperçu de l’application](#aperçu-de-lapplication)
- [Stack technique](#stack-technique)
- [Sécurité et confidentialité](#sécurité-et-confidentialité)
- [Compétences démontrées](#compétences-démontrées)
- [Auteur](#auteur)
- [Licence](#licence)
- [Note](#note)

---

## Contexte du projet

Les démarches de gouvernance cybersécurité, d’audit SSI et de conformité reposent souvent sur plusieurs livrables : référentiel de contrôles, matrice d’écarts, preuves d’audit, scoring de maturité, rapport de synthèse et plan d’action.

L’objectif de GapTrack est de centraliser ces éléments dans une interface simple afin de faciliter :

- l’évaluation d’un niveau de maturité cybersécurité ;
- le suivi des contrôles conformes, partiels, non conformes ou non applicables ;
- la collecte de preuves ou références associées aux contrôles ;
- la comparaison entre plusieurs sessions d’audit ;
- la génération d’un plan d’action priorisé ;
- la production d’une restitution synthétique.

Ce projet s’inscrit dans une logique de **mission conseil cybersécurité / GRC**, avec une attention particulière portée à la structuration des livrables et à leur compréhension par des interlocuteurs techniques ou non techniques.

---

## Objectifs

GapTrack vise à répondre à plusieurs besoins rencontrés lors d’un audit SSI ou d’une démarche de mise en conformité :

- fournir une vision claire de l’état de conformité d’un périmètre audité ;
- identifier rapidement les domaines les plus faibles ;
- suivre les écarts et les actions de remédiation ;
- prioriser les mesures selon leur impact ;
- conserver des preuves ou références utiles à l’audit ;
- comparer l’évolution de la maturité entre plusieurs sessions ;
- produire une restitution exploitable sous forme de rapport.

---

## Fonctionnalités principales

### Audit et suivi des contrôles

- Création et gestion de sessions d’audit.
- Listing des contrôles SSI.
- Statut des contrôles :
  - conforme ;
  - partiel ;
  - non conforme ;
  - non applicable.
- Recherche et filtres sur les contrôles.
- Classement par domaine, impact, priorité ou statut.
- Suivi des écarts identifiés.

### Tableau de bord de maturité

- Calcul d’un score global de maturité.
- Score de maturité par domaine.
- Visualisation radar.
- Identification des domaines à prioriser.
- Comparaison entre plusieurs sessions d’audit.
- Légende de maturité pour faciliter l’interprétation.

### Plan d’action

- Génération d’un plan d’action à partir des écarts.
- Priorisation des actions.
- Attribution d’un responsable.
- Suivi d’une échéance.
- Ajout de commentaires.
- Export des résultats.

### Preuves et documentation

- Ajout de preuves ou références sur les contrôles.
- Ajout de notes d’audit.
- Conservation des éléments justificatifs liés aux contrôles.
- Préparation d’une restitution plus complète.

### Export et restitution

- Export du rapport au format PDF.
- Export CSV pour exploitation externe.
- Présentation synthétique des résultats.
- Support de restitution pour une logique de mission conseil.

### Expérience utilisateur

- Interface bilingue français / anglais.
- Mode clair / sombre.
- Sauvegarde locale dans le navigateur.
- Synchronisation backend possible selon la configuration.
- Interface responsive.

---

## Approche GRC / SSI

GapTrack ne se limite pas à une application technique. Le projet cherche à reproduire une démarche de conseil cybersécurité structurée :

1. **Cadrage du périmètre audité**  
   Définition d’une session d’audit et d’un ensemble de contrôles.

2. **Évaluation des contrôles**  
   Analyse de l’état de conformité ou de maturité de chaque point de contrôle.

3. **Collecte de preuves**  
   Association de notes, preuves ou références permettant de justifier l’évaluation.

4. **Analyse des écarts**  
   Identification des contrôles non satisfaits ou partiellement satisfaits.

5. **Scoring de maturité**  
   Calcul d’un score global et par domaine afin d’obtenir une vision synthétique.

6. **Priorisation**  
   Mise en évidence des domaines et actions à traiter en priorité.

7. **Plan d’action**  
   Construction d’une feuille de route de remédiation.

8. **Restitution**  
   Génération d’un rapport exploitable pour un décideur, un RSSI ou une équipe projet.

---

## Scoring de maturité

Le scoring de maturité repose sur une logique pondérée.

Chaque contrôle possède un niveau d’impact. Le score global est calculé à partir des contrôles applicables et de leur niveau de réalisation.

Principe général :

```text
Score de maturité = somme pondérée des contrôles réalisés / somme des impacts applicables
```

Les contrôles non applicables sont exclus du calcul afin de ne pas fausser le score.

Une légende permet d’interpréter le niveau de maturité obtenu :

| Score | Niveau | Interprétation |
|---:|---|---|
| 0 % à 20 % | Critique | Aucun dispositif structuré ou maturité très faible |
| 21 % à 40 % | Initial | Premiers contrôles présents, mais démarche encore fragile |
| 41 % à 60 % | En construction | Dispositif partiellement structuré |
| 61 % à 80 % | Géré | Contrôles majoritairement en place et suivis |
| 81 % à 100 % | Optimisé | Dispositif mature, suivi et amélioration continue |

---

## Cas d’usage

### Exemple : audit cybersécurité d’une PME fictive

Une PME souhaite évaluer sa maturité SSI avant une revue client ou une démarche de conformité.

Avec GapTrack, l’auditeur peut :

1. créer une session d’audit ;
2. parcourir les contrôles du référentiel ;
3. qualifier chaque contrôle : conforme, partiel, non conforme ou non applicable ;
4. ajouter des preuves ou notes d’audit ;
5. visualiser le score de maturité global et par domaine ;
6. identifier les domaines les plus faibles ;
7. construire un plan d’action priorisé ;
8. exporter une restitution PDF ou CSV.

Ce cas d’usage permet de simuler une mission GRC complète : diagnostic, analyse d’écarts, recommandations et restitution.

---

## Aperçu de l’application

### Tableau de bord

Le tableau de bord permet de visualiser :

- la maturité globale ;
- la maturité par domaine ;
- les domaines prioritaires ;
- la comparaison entre sessions ;
- la signification du score obtenu.

### Listing des contrôles

La vue de listing permet de :

- parcourir les contrôles ;
- filtrer les résultats ;
- modifier leur statut ;
- ajouter des preuves ;
- suivre les écarts.

### Plan d’action

Le plan d’action permet de structurer les mesures de remédiation avec :

- priorité ;
- responsable ;
- échéance ;
- commentaire ;
- export.

> Des captures d’écran peuvent être ajoutées dans un dossier `/docs` ou `/public/screenshots`.

Exemple recommandé :

```md
![Tableau de bord GapTrack](./docs/dashboard.png)
![Listing des contrôles](./docs/controls.png)
![Plan d’action](./docs/action-plan.png)
```

---

## Stack technique

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Radix UI
- Lucide React

### Backend

- Node.js
- Fastify
- TypeScript
- Prisma
- SQLite
- JWT
- Argon2
- Zod

### Outils

- ESLint
- Prettier
- pnpm
- Vercel pour le déploiement frontend

---

## Sécurité et confidentialité

GapTrack est un projet académique et démonstratif. Il ne doit pas être utilisé en production sans revue de sécurité préalable.

Points pris en compte :

- authentification par cookie HTTP-only côté backend ;
- hachage des mots de passe avec Argon2 ;
- validation des entrées avec Zod ;
- séparation frontend / backend ;
- gestion d’un secret JWT via variable d’environnement ;
- sauvegarde locale possible dans le navigateur ;
- synchronisation backend configurable.

Limites actuelles :

- le mode `DEV_BYPASS_AUTH` est destiné uniquement au développement local ;
- le secret JWT doit être remplacé par une valeur robuste en production ;
- la gestion fine des rôles et permissions doit être renforcée avant usage réel ;
- aucune donnée sensible réelle ne doit être saisie dans la version de démonstration.

---

## Compétences démontrées

Ce projet démontre plusieurs compétences utiles dans un contexte cybersécurité, GRC et conseil.

### GRC / SSI

- Structuration d’un audit SSI.
- Modélisation d’un référentiel de contrôles.
- Suivi des écarts.
- Gestion de preuves.
- Construction d’un plan d’action.
- Scoring de maturité.
- Restitution synthétique pour décideurs.

### Cybersécurité

- Sensibilisation aux démarches de conformité.
- Notions de gouvernance SSI.
- Gestion des risques et priorisation.
- Prise en compte de la confidentialité des données.
- Authentification et gestion de session côté backend.

### Développement

- Développement frontend avec React et TypeScript.
- Création d’une interface utilisateur structurée.
- Visualisation de données avec graphiques.
- Développement backend avec Fastify.
- Utilisation de Prisma et SQLite.
- Validation des données avec Zod.
- Organisation d’un projet full-stack.

### Conseil

- Capacité à transformer un besoin métier en outil.
- Formalisation d’un diagnostic.
- Production de livrables exploitables.
- Vulgarisation des résultats de sécurité.
- Priorisation des recommandations.

---

## Auteur

**Julien Messaoudi**  
Étudiant ingénieur en cybersécurité — ESIEE Paris  
Orientation : GRC, analyse de risques, conformité SSI, cybersécurité et développement d’outils d’audit.

- GitHub : https://github.com/JulienMessaoudi
- LinkedIn : https://www.linkedin.com/in/julien-messaoudi

---

## Licence

Projet réalisé à des fins académiques et de démonstration.

Aucune donnée sensible réelle ne doit être utilisée dans l’application de démonstration.

---

## Note

GapTrack est un projet d’apprentissage visant à démontrer une capacité à relier cybersécurité, GRC, développement logiciel et restitution conseil. Il ne constitue pas un outil certifié d’audit ou de conformité.
