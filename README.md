# GapTrack — Plateforme d’audit GRC / SSI

**GapTrack** est une application web de gestion d’audits de cybersécurité permettant d’évaluer un périmètre, de mesurer sa maturité, de suivre les écarts, d’associer des preuves et de construire un plan d’action priorisé.

Le projet reproduit les principales étapes d’une mission GRC / SSI : cadrage, évaluation des contrôles, collecte d’éléments justificatifs, analyse des écarts, scoring, priorisation et restitution.

🔗 **Application en ligne** : https://gaptrack.fr/  
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

Les démarches de gouvernance cybersécurité, d’audit SSI et de conformité s’appuient généralement sur plusieurs éléments : référentiel de contrôles, périmètre audité, évaluations, preuves, matrice d’écarts, scoring de maturité, plan d’action et rapport de synthèse.

GapTrack centralise ces éléments dans une même application afin de faciliter :

- la création et le suivi de plusieurs audits ;
- l’évaluation des contrôles d’un référentiel ;
- le suivi des contrôles conformes, partiels, non conformes, non applicables ou non encore évalués ;
- l’association de notes et de références de preuve ;
- la comparaison entre plusieurs audits ;
- la génération d’un plan d’action priorisé ;
- la production d’une restitution exploitable.

Le projet s’inscrit dans une logique de **mission de conseil en cybersécurité et GRC**, avec une attention particulière portée à la lisibilité des résultats pour des interlocuteurs techniques comme non techniques.

---

## Objectifs

GapTrack vise à répondre à plusieurs besoins rencontrés lors d’un audit SSI ou d’une démarche de mise en conformité :

- fournir une vision claire de l’état de conformité d’un périmètre ;
- mesurer la couverture et la maturité de l’audit ;
- identifier rapidement les domaines les plus faibles ;
- suivre les écarts et les actions de remédiation ;
- prioriser les mesures selon leur impact ;
- conserver les notes et références utiles à l’audit ;
- comparer l’évolution de la maturité entre plusieurs sessions ;
- produire une restitution synthétique sous forme de rapport.

---

## Fonctionnalités principales

### Gestion des audits

- Création de plusieurs audits.
- Duplication d’un audit existant.
- Modification des informations générales d’un audit.
- Suppression d’un audit.
- Sélection du périmètre et du contexte d’évaluation.
- Sauvegarde persistante des données dans Supabase.
- Comparaison entre plusieurs audits.

### Évaluation des contrôles

Chaque contrôle peut être associé à l’un des statuts suivants :

- non évalué ;
- conforme ;
- partiellement conforme ;
- non conforme ;
- non applicable.

L’application permet également :

- de rechercher un contrôle ;
- de filtrer les contrôles par statut, domaine ou priorité ;
- de classer les résultats ;
- d’ajouter une note d’audit ;
- d’associer une référence de preuve ;
- d’identifier les écarts nécessitant une action.

### Tableau de bord de maturité

- Calcul d’un score global de maturité.
- Calcul d’un score par domaine.
- Calcul du taux de couverture de l’audit.
- Visualisation radar des résultats.
- Identification des domaines prioritaires.
- Comparaison entre plusieurs audits.
- Légende de maturité facilitant l’interprétation du score.

### Plan d’action

- Génération d’actions à partir des écarts identifiés.
- Définition d’une priorité.
- Attribution d’un responsable.
- Ajout d’une échéance.
- Ajout de commentaires et de recommandations.
- Suivi de l’avancement des actions.
- Export des résultats.

### Preuves et documentation

- Ajout de références de preuve sur les contrôles.
- Ajout de notes d’audit.
- Conservation des éléments justificatifs associés aux évaluations.
- Préparation d’une restitution structurée.

### Export et restitution

- Génération d’un rapport PDF.
- Export CSV pour exploitation externe.
- Présentation synthétique des résultats.
- Restitution adaptée à une logique de mission de conseil.

### Comptes et accès

- Création de compte et connexion avec Supabase Auth.
- Réinitialisation du mot de passe.
- Gestion d’une session utilisateur dans le navigateur.
- Option « Se souvenir de moi ».
- Gestion de profils et de rôles applicatifs.
- Déconnexion et invalidation de la session active.

### Expérience utilisateur

- Interface bilingue français / anglais.
- Mode clair et mode sombre.
- Interface responsive.
- Navigation adaptée aux principaux écrans de l’application.
- Notifications de confirmation et d’erreur.
- Animations et transitions d’interface.

---

## Approche GRC / SSI

GapTrack cherche à reproduire une démarche d’audit structurée.

### 1. Cadrage du périmètre

Création d’un audit, définition de son contexte, de son type, de sa criticité et du périmètre concerné.

### 2. Évaluation des contrôles

Analyse de l’état de conformité ou de maturité de chaque point de contrôle.

### 3. Collecte de preuves

Association de notes et de références permettant de justifier les évaluations réalisées.

### 4. Analyse des écarts

Identification des contrôles non conformes ou partiellement conformes.

### 5. Scoring de maturité

Calcul d’un score global et par domaine afin d’obtenir une vision synthétique de la situation.

### 6. Priorisation

Mise en évidence des domaines, contrôles et actions nécessitant une attention prioritaire.

### 7. Plan d’action

Construction d’une feuille de route de remédiation avec responsables, priorités, échéances et commentaires.

### 8. Restitution

Génération d’un rapport exploitable par un décideur, un RSSI, un auditeur ou une équipe projet.

---

## Scoring de maturité

Le scoring de maturité repose sur une logique pondérée.

Chaque contrôle possède un niveau d’impact. Le score est calculé à partir des contrôles évalués et applicables, en tenant compte de leur niveau de réalisation.

```text
Score de maturité =
somme des points pondérés obtenus
/
somme des impacts des contrôles évalués et applicables
```

Les contrôles non applicables et les contrôles non encore évalués sont exclus du calcul de maturité afin de ne pas fausser le résultat.

L’application distingue également :

- le **score de maturité**, qui mesure le niveau atteint sur les contrôles évalués et applicables ;
- la **couverture de l’audit**, qui indique la proportion de contrôles effectivement évalués.

| Score | Niveau | Interprétation |
|---:|---|---|
| 0 % à 20 % | Critique | Aucun dispositif structuré ou maturité très faible |
| 21 % à 40 % | Initial | Premiers contrôles présents, mais démarche encore fragile |
| 41 % à 60 % | En construction | Dispositif partiellement structuré |
| 61 % à 80 % | Géré | Contrôles majoritairement en place et suivis |
| 81 % à 100 % | Optimisé | Dispositif mature, suivi et amélioration continue |

---

## Cas d’usage

### Exemple : audit cybersécurité d’une PME

Une PME souhaite évaluer sa maturité SSI avant une revue client, une démarche de conformité ou la mise en place d’un programme d’amélioration.

Avec GapTrack, l’auditeur peut :

1. créer une session d’audit ;
2. renseigner le périmètre et le contexte ;
3. parcourir les contrôles du référentiel ;
4. qualifier chaque contrôle ;
5. ajouter des notes et des références de preuve ;
6. visualiser la couverture et le score de maturité ;
7. identifier les domaines les plus faibles ;
8. construire un plan d’action priorisé ;
9. comparer les résultats avec un autre audit ;
10. exporter une restitution PDF ou CSV.

Ce cas d’usage permet de simuler une mission GRC complète : diagnostic, analyse d’écarts, recommandations, suivi et restitution.

---

## Aperçu de l’application

### Tableau de bord

Le tableau de bord permet de visualiser :

- la maturité globale ;
- la couverture de l’audit ;
- la maturité par domaine ;
- les domaines prioritaires ;
- la répartition des statuts ;
- la comparaison entre plusieurs audits ;
- la signification du score obtenu.

### Liste des contrôles

La vue des contrôles permet de :

- parcourir le référentiel ;
- rechercher et filtrer les résultats ;
- modifier le statut d’un contrôle ;
- ajouter une note ;
- associer une référence de preuve ;
- identifier et suivre les écarts.

### Plan d’action

Le plan d’action structure les mesures de remédiation avec :

- priorité ;
- responsable ;
- échéance ;
- statut ;
- commentaire ;
- recommandation ;
- export.

### Gestion des utilisateurs

Selon les droits attribués, l’application permet de gérer différents profils :

- administrateur ;
- auditeur ;
- contributeur ;
- lecteur.

---

## Stack technique

### Application web

- **Astro** pour la structure du site et la génération statique.
- **React** pour les interfaces interactives.
- **TypeScript** pour le typage et la fiabilité du code.
- **Tailwind CSS** pour la mise en forme.
- **Radix UI** pour certains composants d’interface accessibles.
- **Lucide React** pour les icônes.
- **Recharts** pour les graphiques et visualisations.
- **Motion** et **GSAP** pour les animations.
- **Sonner** pour les notifications.

### Authentification et données

- **Supabase Auth** pour la création de compte, la connexion, la déconnexion et la réinitialisation du mot de passe.
- **Supabase Database** pour la persistance des profils, audits et données associées.
- **Supabase JavaScript Client** pour les échanges entre l’application et Supabase.
- Fonctions RPC Supabase pour certaines opérations applicatives et administratives.

### Export

- **jsPDF** pour la génération des rapports PDF.
- **jsPDF AutoTable** pour la création de tableaux dans les rapports.
- Export CSV pour l’exploitation des données dans d’autres outils.

### Qualité et déploiement

- **ESLint** pour l’analyse statique du code.
- **Prettier** pour le formatage.
- **Vite**, utilisé par Astro pour le développement et la construction.
- **Vercel** pour l’hébergement et le déploiement.

> La version actuelle de GapTrack repose principalement sur Astro, React et Supabase. L’ancienne architecture Fastify, Prisma et SQLite ne décrit plus le fonctionnement principal de l’application déployée.

---

## Sécurité et confidentialité

GapTrack utilise désormais **Supabase Auth** pour gérer l’authentification.

La session n’est pas gérée par un cookie HTTP-only provenant d’un backend Fastify. Elle est gérée côté navigateur par le client Supabase :

- la session est conservée dans `sessionStorage` par défaut ;
- lorsque l’option « Se souvenir de moi » est activée, elle est conservée dans `localStorage` ;
- le jeton de session peut être rafraîchi automatiquement par Supabase ;
- les liens de confirmation ou de réinitialisation peuvent être détectés depuis l’URL ;
- la déconnexion supprime les données de session du stockage navigateur.

Les paramètres publics de connexion à Supabase sont fournis à l’application par des variables d’environnement. Les opérations sensibles et les règles d’accès aux données doivent être protégées côté Supabase, notamment au moyen de politiques de sécurité adaptées et de fonctions SQL contrôlées.

### Points de vigilance

- Les jetons de session sont accessibles au contexte JavaScript du navigateur : la prévention des failles XSS est donc essentielle.
- Les politiques Row Level Security de Supabase doivent être vérifiées pour chaque table exposée.
- Les rôles affichés dans l’interface ne remplacent pas des contrôles d’autorisation côté base de données.
- Les fonctions RPC doivent vérifier les droits de l’utilisateur appelant.
- Les clés de service Supabase ne doivent jamais être exposées dans le frontend.
- Aucune donnée sensible réelle ne doit être saisie dans une version de démonstration sans revue de sécurité préalable.
- Une revue de sécurité complète reste nécessaire avant tout usage en production.

---

## Compétences démontrées

### GRC / SSI

- Structuration d’un audit SSI.
- Modélisation d’un référentiel de contrôles.
- Évaluation de conformité.
- Calcul d’un score de maturité.
- Mesure de la couverture d’un audit.
- Suivi des écarts.
- Gestion de preuves et de notes d’audit.
- Construction d’un plan d’action.
- Comparaison entre plusieurs audits.
- Restitution synthétique pour des décideurs.

### Cybersécurité

- Gouvernance de la sécurité des systèmes d’information.
- Analyse des écarts et priorisation.
- Gestion des risques et des actions de remédiation.
- Gestion de l’authentification et des sessions.
- Prise en compte des droits d’accès.
- Sensibilisation aux politiques de sécurité côté base de données.
- Prise en compte de la confidentialité et de l’intégrité des données.

### Développement

- Développement d’une application avec Astro, React et TypeScript.
- Intégration de Supabase Auth et Supabase Database.
- Gestion d’une session persistante dans le navigateur.
- Création d’interfaces responsives.
- Visualisation de données avec des graphiques.
- Génération de rapports PDF.
- Export de données au format CSV.
- Organisation d’une application web déployée sur Vercel.

### Conseil

- Transformation d’un besoin métier en outil.
- Formalisation d’un diagnostic.
- Production de livrables exploitables.
- Vulgarisation des résultats de sécurité.
- Priorisation des recommandations.
- Présentation d’indicateurs à des interlocuteurs techniques ou non techniques.

---

## Auteur

**Julien Messaoudi**  
Étudiant ingénieur en cybersécurité — ESIEE Paris

Orientation : GRC, analyse de risques, conformité SSI, cybersécurité et développement d’outils d’audit.

- GitHub : https://github.com/JulienMessaoudi
- LinkedIn : https://www.linkedin.com/in/julien-messaoudi

---

## Licence

Projet réalisé à des fins académiques, de démonstration et d’apprentissage.

Aucune donnée sensible réelle ne doit être utilisée dans l’application de démonstration sans mesures de sécurité adaptées.

---

## Note

GapTrack est un projet d’apprentissage visant à démontrer une capacité à relier cybersécurité, GRC, développement logiciel et restitution de conseil.

Il ne constitue pas un outil certifié d’audit, de conformité ou de gestion des risques. Les résultats produits doivent être interprétés et validés par une personne compétente avant toute utilisation dans un contexte réel.
