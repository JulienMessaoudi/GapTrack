\# GapTrack — Plateforme pilote d’audit GRC / SSI



\*\*GapTrack\*\* est une application web de gestion d’audits de cybersécurité. Elle permet de cadrer un périmètre, d’évaluer des contrôles, de mesurer la maturité, de documenter les écarts, d’associer des éléments de preuve et de construire un plan d’action priorisé.



Le projet reproduit les principales étapes d’une mission GRC / SSI : cadrage, évaluation, collecte de justificatifs, analyse des écarts, scoring, priorisation et restitution.



> \*\*Statut : bêta publique / démonstrateur avancé.\*\* GapTrack est actuellement un projet académique et expérimental. Il ne constitue pas un outil certifié d’audit, de conformité ou de gestion des risques. Les données et résultats doivent être examinés par une personne compétente avant toute utilisation professionnelle.



🔗 \*\*Application en ligne\*\* : https://gaptrack.fr/  

🔗 \*\*Code source\*\* : https://github.com/JulienMessaoudi/GapTrack



\---



\## Sommaire



\- \[Statut du projet](#statut-du-projet)

\- \[Contexte](#contexte)

\- \[Objectifs](#objectifs)

\- \[Fonctionnalités principales](#fonctionnalités-principales)

\- \[Approche GRC / SSI](#approche-grc--ssi)

\- \[Scoring de maturité](#scoring-de-maturité)

\- \[Cas d’usage](#cas-dusage)

\- \[Architecture technique](#architecture-technique)

\- \[Sécurité et confidentialité](#sécurité-et-confidentialité)

\- \[Limites actuelles](#limites-actuelles)

\- \[Feuille de route](#feuille-de-route)

\- \[Compétences démontrées](#compétences-démontrées)

\- \[Auteur](#auteur)

\- \[Licence et usage](#licence-et-usage)



\---



\## Statut du projet



GapTrack est une \*\*bêta publique à vocation de démonstration, d’apprentissage et de validation produit\*\*.



La version actuelle permet de tester les principaux parcours fonctionnels d’un outil d’audit SSI, mais elle ne doit pas être assimilée à une solution certifiée ou homologuée. En particulier :



\- GapTrack ne délivre aucune certification de conformité ;

\- les scores produits sont des indicateurs d’aide à l’analyse ;

\- les référentiels proposés doivent être vérifiés et adaptés au contexte de l’organisation ;

\- les résultats doivent être validés par un auditeur, un RSSI ou un consultant compétent ;

\- l’utilisation de données sensibles réelles nécessite une revue de sécurité, juridique et contractuelle préalable.



Le développement se poursuit avec un objectif de durcissement progressif de la sécurité, de la qualité logicielle et du modèle multi-utilisateur.



\---



\## Contexte



Les démarches de gouvernance cybersécurité, d’audit SSI et de conformité s’appuient généralement sur plusieurs éléments :



\- un référentiel de contrôles ;

\- un périmètre audité ;

\- des évaluations documentées ;

\- des preuves ou références de preuve ;

\- une matrice d’écarts ;

\- un score de maturité et un taux de couverture ;

\- un plan d’action ;

\- une restitution destinée aux parties prenantes.



GapTrack centralise ces éléments afin de faciliter le travail de l’auditeur et la lecture des résultats par des interlocuteurs techniques comme non techniques.



Le projet s’inscrit dans une logique de \*\*mission de conseil en cybersécurité et GRC\*\* : structurer le diagnostic, justifier les constats, prioriser les recommandations et produire une restitution exploitable.



\---



\## Objectifs



GapTrack vise à répondre à plusieurs besoins rencontrés lors d’un audit SSI ou d’une démarche de mise en conformité :



\- fournir une vision claire de l’état d’un périmètre ;

\- mesurer séparément la maturité et la couverture de l’évaluation ;

\- identifier rapidement les domaines les plus faibles ;

\- documenter les constats et les écarts ;

\- suivre les actions de remédiation ;

\- prioriser les mesures selon leur impact ;

\- conserver les notes et références utiles à l’audit ;

\- comparer l’évolution entre plusieurs sessions ;

\- produire une restitution synthétique sous forme de rapport.



GapTrack peut contribuer à structurer un travail autour de cadres comme \*\*ISO 27001, NIS2, DORA, le RGPD ou la PGSSI-S\*\*, sans remplacer l’analyse juridique, réglementaire ou méthodologique propre à chaque référentiel.



\---



\## Fonctionnalités principales



\### Gestion des audits



\- Création de plusieurs audits selon le plan utilisé.

\- Duplication d’un audit existant.

\- Modification des informations générales.

\- Suppression d’un audit.

\- Définition du périmètre, du contexte et de la criticité.

\- Sauvegarde persistante des sessions d’audit.

\- Comparaison entre plusieurs audits.



\### Évaluation des contrôles



Chaque contrôle peut être associé à l’un des statuts suivants :



\- non évalué ;

\- conforme ;

\- partiellement conforme ;

\- non conforme ;

\- non applicable.



L’application permet également :



\- de rechercher un contrôle ;

\- de filtrer les contrôles par statut, domaine ou priorité ;

\- de classer les résultats ;

\- d’ajouter une note d’audit ;

\- d’associer une référence de preuve ;

\- d’identifier les écarts nécessitant une action.



\### Tableau de bord de maturité



\- Calcul d’un score global de maturité.

\- Calcul d’un score par domaine.

\- Calcul du taux de couverture de l’audit.

\- Visualisation graphique des résultats.

\- Identification des domaines prioritaires.

\- Comparaison entre plusieurs sessions.

\- Aide à l’interprétation du score obtenu.



\### Plan d’action



\- Génération d’actions à partir des écarts identifiés.

\- Définition d’une priorité.

\- Attribution d’un responsable.

\- Ajout d’une échéance.

\- Ajout de commentaires et de recommandations.

\- Suivi de l’avancement.

\- Export des résultats selon le plan utilisé.



\### Preuves et documentation



\- Ajout de notes et de références de preuve.

\- Association des justificatifs aux contrôles évalués.

\- Conservation des métadonnées des fichiers déposés.

\- Préparation d’une restitution structurée.

\- Contrôle des accès aux éléments partagés selon le rôle et le groupe de l’utilisateur.



> La gestion de preuves dans une version de démonstration ne dispense pas d’une politique de classification, de rétention, de chiffrement et de contrôle d’accès adaptée au contexte de l’organisation.



\### Export et restitution



\- Génération d’un rapport PDF.

\- Export CSV pour exploitation externe.

\- Présentation synthétique des résultats.

\- Restitution adaptée à une logique de mission de conseil.



\### Comptes et accès



\- Création de compte et connexion avec Supabase Auth.

\- Confirmation de l’adresse électronique.

\- Réinitialisation du mot de passe.

\- Gestion de la session utilisateur dans le navigateur.

\- Option « Se souvenir de moi ».

\- Gestion de profils et de rôles applicatifs.

\- Séparation des données par utilisateur ou groupe selon les politiques d’accès.

\- Déconnexion et suppression locale de la session active.



\### Expérience utilisateur



\- Interface en français et en anglais.

\- Mode clair et mode sombre.

\- Interface responsive.

\- Navigation adaptée aux principaux écrans.

\- Notifications de confirmation et d’erreur.

\- Animations et transitions d’interface.



\---



\## Approche GRC / SSI



GapTrack cherche à reproduire une démarche d’audit structurée.



\### 1. Cadrage du périmètre



Création d’un audit et définition de son contexte, de son type, de sa criticité et du périmètre concerné.



\### 2. Évaluation des contrôles



Analyse de l’état de conformité ou de maturité de chaque point de contrôle.



\### 3. Collecte de preuves



Association de notes, de références et, selon les fonctionnalités activées, de fichiers permettant de justifier les évaluations.



\### 4. Analyse des écarts



Identification des contrôles non conformes ou partiellement conformes.



\### 5. Scoring de maturité



Calcul d’un score global et par domaine afin d’obtenir une vision synthétique de la situation.



\### 6. Priorisation



Mise en évidence des domaines, contrôles et actions nécessitant une attention prioritaire.



\### 7. Plan d’action



Construction d’une feuille de route de remédiation avec responsables, priorités, échéances et commentaires.



\### 8. Restitution



Génération d’un rapport destiné à un décideur, un RSSI, un auditeur ou une équipe projet.



\---



\## Scoring de maturité



Le scoring de maturité repose sur une logique pondérée.



Chaque contrôle possède un niveau d’impact. Le score est calculé à partir des contrôles évalués et applicables, en tenant compte de leur niveau de réalisation.



```text

Score de maturité =

somme des points pondérés obtenus

/

somme des impacts des contrôles évalués et applicables

```



Les contrôles non applicables et les contrôles non encore évalués sont exclus du calcul de maturité afin de ne pas fausser le résultat.



L’application distingue :



\- le \*\*score de maturité\*\*, qui mesure le niveau atteint sur les contrôles évalués et applicables ;

\- la \*\*couverture de l’audit\*\*, qui indique la proportion de contrôles effectivement évalués.



| Score | Niveau | Interprétation indicative |

|---:|---|---|

| 0 % à 20 % | Critique | Aucun dispositif structuré ou maturité très faible |

| 21 % à 40 % | Initial | Premiers contrôles présents, mais démarche encore fragile |

| 41 % à 60 % | En construction | Dispositif partiellement structuré |

| 61 % à 80 % | Géré | Contrôles majoritairement en place et suivis |

| 81 % à 100 % | Optimisé | Dispositif mature, suivi et amélioration continue |



> Cette échelle constitue une aide à la lecture. Elle ne correspond pas automatiquement à un niveau de conformité officiel et doit être contextualisée par l’auditeur.



\---



\## Cas d’usage



\### Exemple : audit cybersécurité d’une PME



Une PME souhaite évaluer sa maturité SSI avant une revue client, une démarche de conformité ou la mise en place d’un programme d’amélioration.



Avec GapTrack, l’auditeur peut :



1\. créer une session d’audit ;

2\. renseigner le périmètre et le contexte ;

3\. parcourir les contrôles du référentiel ;

4\. qualifier chaque contrôle ;

5\. ajouter des notes et des références de preuve ;

6\. visualiser la couverture et le score de maturité ;

7\. identifier les domaines les plus faibles ;

8\. construire un plan d’action priorisé ;

9\. comparer les résultats avec un autre audit ;

10\. exporter une restitution PDF ou CSV.



Ce parcours permet de simuler une mission GRC complète : diagnostic, analyse d’écarts, recommandations, suivi et restitution.



\---



\## Architecture technique



\### Application web



\- \*\*Astro\*\* pour la structure du site et la génération statique.

\- \*\*React\*\* pour les interfaces interactives.

\- \*\*TypeScript\*\* pour le typage du code.

\- \*\*Tailwind CSS\*\* pour la mise en forme.

\- \*\*Radix UI\*\* pour certains composants accessibles.

\- \*\*Lucide React\*\* pour les icônes.

\- \*\*Recharts\*\* pour les graphiques.

\- \*\*Motion\*\* et \*\*GSAP\*\* pour les animations.

\- \*\*Sonner\*\* pour les notifications.



\### Authentification et données



\- \*\*Supabase Auth\*\* pour la création de compte, la connexion, la déconnexion et la réinitialisation du mot de passe.

\- \*\*PostgreSQL / Supabase Database\*\* pour la persistance des profils, audits et métadonnées associées.

\- \*\*Supabase Storage\*\* pour les fichiers de preuve lorsque cette fonctionnalité est activée.

\- \*\*Row Level Security\*\* pour appliquer les règles d’accès au niveau de la base de données.

\- \*\*Fonctions SQL contrôlées\*\* pour certaines opérations applicatives ou administratives.

\- \*\*Supabase Edge Functions\*\* pour les traitements nécessitant des secrets ou des privilèges serveur, notamment le formulaire de contact et certaines opérations de compte.



\### Export



\- \*\*jsPDF\*\* pour la génération des rapports PDF.

\- \*\*jsPDF AutoTable\*\* pour les tableaux intégrés aux rapports.

\- Export CSV pour l’exploitation des données dans d’autres outils.



\### Qualité et déploiement



\- \*\*ESLint\*\* pour l’analyse statique du code.

\- \*\*Prettier\*\* pour le formatage.

\- \*\*Vite\*\*, utilisé par Astro pour le développement et la construction.

\- \*\*Vercel\*\* pour l’hébergement, les domaines et les déploiements.



\### Vue simplifiée



```text

Navigateur

&#x20;  |

&#x20;  |-- Site statique Astro / composants React

&#x20;  |

&#x20;  |-- Supabase Auth

&#x20;  |-- API Supabase protégée par RLS

&#x20;  |-- Storage protégé par politiques d’accès

&#x20;  |-- Edge Functions pour les opérations serveur

&#x20;  |

Vercel héberge l’application web

Supabase héberge l’authentification, les données et les fichiers

```



> La version actuellement déployée repose principalement sur Astro, React, Vercel et Supabase. L’ancienne architecture Fastify, Prisma et SQLite ne décrit plus le fonctionnement principal de l’application.



\---



\## Sécurité et confidentialité



La sécurité de GapTrack repose sur plusieurs niveaux de contrôle. Ces mesures réduisent les risques, mais ne constituent pas à elles seules une homologation ou une certification de sécurité.



\### Mesures actuellement mises en œuvre



\- Authentification gérée par \*\*Supabase Auth\*\*.

\- Row Level Security activée sur les tables applicatives exposées.

\- Politiques d’accès fondées sur l’identité, le rôle, l’état du compte et le groupe de l’utilisateur.

\- Vérifications d’autorisation dans les fonctions privilégiées.

\- Clés de service réservées aux traitements serveur et absentes du frontend.

\- Validation et nettoyage des données reçues par les fonctions publiques.

\- Limitation des soumissions du formulaire de contact.

\- Contrôle des origines autorisées pour les appels au formulaire public.

\- En-têtes HTTP de sécurité sur le déploiement Vercel, notamment HSTS, protection anti-iframe, `nosniff`, Referrer Policy et Permissions Policy.

\- Désindexation et absence de cache public sur les routes d’authentification et les pages applicatives.

\- Exclusion des fichiers `.env`, bases locales, journaux, dépendances et fichiers téléversés du dépôt Git.



\### Gestion des sessions



La session est gérée dans le navigateur par le client Supabase :



\- `sessionStorage` est utilisé par défaut ;

\- `localStorage` est utilisé lorsque l’option « Se souvenir de moi » est activée ;

\- le jeton peut être rafraîchi automatiquement par Supabase ;

\- la déconnexion supprime les informations de session du stockage utilisé.



Ce modèle implique que les jetons sont accessibles au contexte JavaScript de l’application. La prévention des vulnérabilités XSS, la maîtrise des dépendances et le déploiement d’une politique CSP complète sont donc essentiels.



\### Principes d’autorisation



\- Les rôles affichés dans l’interface ne constituent jamais, seuls, une mesure de sécurité.

\- Les droits doivent être vérifiés côté base de données ou côté fonction serveur.

\- Les opérations administratives doivent appliquer le principe du moindre privilège.

\- Les fonctions `SECURITY DEFINER` doivent limiter explicitement leurs appelants, leur `search\_path` et les actions autorisées.

\- Les clés publiques Supabase peuvent être présentes dans le client ; les clés secrètes et `service\_role` ne doivent jamais y être exposées.



\### Données sensibles



La version publique de GapTrack doit être considérée comme une \*\*bêta de démonstration\*\*.



Avant tout usage avec des données réelles sensibles, il convient notamment de définir et vérifier :



\- la classification des preuves ;

\- les règles de conservation et de suppression ;

\- les obligations contractuelles et réglementaires ;

\- la localisation et les transferts de données ;

\- les sauvegardes et procédures de restauration ;

\- la gestion des incidents ;

\- la journalisation des actions sensibles ;

\- les habilitations et revues périodiques des accès ;

\- les engagements des sous-traitants techniques.



\### Signalement d’une vulnérabilité



Une vulnérabilité ne doit pas être publiée dans une issue GitHub publique avec des données exploitables. Elle peut être signalée de manière responsable via le formulaire de contact du site ou directement à l’auteur du projet.



\---



\## Limites actuelles



Les limites suivantes sont connues ou font partie du travail de durcissement en cours :



\- absence de certification ou d’homologation du produit ;

\- politique Content Security Policy encore à renforcer ;

\- couverture de tests automatisés et tests d’autorisation à compléter ;

\- chaîne CI/CD et protection de la branche principale à industrialiser ;

\- modèle de données encore adapté à un MVP, avec certaines données d’audit regroupées en JSON ;

\- journal d’audit métier append-only à mettre en place ;

\- gouvernance complète du cycle de vie des preuves à formaliser ;

\- documentation d’exploitation, de sauvegarde et de réponse à incident à compléter ;

\- validation externe de la sécurité non encore réalisée.



Ces limites sont documentées afin d’éviter toute confusion entre un démonstrateur avancé et un produit déjà qualifié pour des environnements sensibles.



\---



\## Feuille de route



\### Sécurité



\- Déployer une Content Security Policy complète et testée.

\- Traiter les recommandations restantes des outils d’analyse Supabase.

\- Renforcer la protection des mots de passe et des parcours d’authentification.

\- Réduire l’exposition des fonctions privilégiées.

\- Ajouter des tests automatisés dédiés aux politiques RLS et aux fonctions RPC.

\- Mettre en place un journal d’audit append-only pour les actions sensibles.

\- Formaliser la rétention, la suppression et l’intégrité des preuves.



\### Qualité logicielle



\- Ajouter un contrôle TypeScript explicite.

\- Développer les tests unitaires, d’intégration et de bout en bout.

\- Mettre en place une CI obligatoire avant déploiement.

\- Protéger la branche principale et privilégier les pull requests relues.

\- Ajouter l’analyse des dépendances et la détection de secrets.

\- Utiliser les environnements de prévisualisation avant promotion en production.



\### Produit et données



\- Normaliser progressivement le modèle multi-organisation.

\- Versionner les référentiels, contrôles et évaluations.

\- Améliorer la traçabilité des validations et modifications.

\- Étendre les modèles de rapports et les exports.

\- Documenter précisément les différences entre les offres Free et Premium.

\- Préparer les documents de confiance nécessaires à un usage professionnel.



\---



\## Compétences démontrées



\### GRC / SSI



\- Structuration d’un audit SSI.

\- Modélisation d’un référentiel de contrôles.

\- Évaluation de conformité et de maturité.

\- Calcul d’un score et d’un taux de couverture.

\- Suivi des écarts.

\- Gestion de preuves et de notes d’audit.

\- Construction d’un plan d’action.

\- Comparaison entre plusieurs sessions.

\- Restitution synthétique pour des décideurs.



\### Cybersécurité



\- Gouvernance de la sécurité des systèmes d’information.

\- Analyse des écarts et priorisation.

\- Gestion des risques et des actions de remédiation.

\- Gestion de l’authentification et des sessions.

\- Mise en œuvre de contrôles d’autorisation côté base de données.

\- Utilisation de politiques Row Level Security.

\- Séparation entre traitements client et opérations privilégiées côté serveur.

\- Prise en compte de la confidentialité, de l’intégrité et de la traçabilité.



\### Développement



\- Développement d’une application avec Astro, React et TypeScript.

\- Intégration de Supabase Auth, Database, Storage et Edge Functions.

\- Création d’interfaces responsives.

\- Visualisation de données avec des graphiques.

\- Génération de rapports PDF.

\- Export de données au format CSV.

\- Déploiement et configuration d’une application sur Vercel.



\### Conseil



\- Transformation d’un besoin métier en outil.

\- Formalisation d’un diagnostic.

\- Production de livrables exploitables.

\- Vulgarisation des résultats de sécurité.

\- Priorisation des recommandations.

\- Présentation d’indicateurs à des interlocuteurs techniques ou non techniques.

\- Documentation transparente des limites et hypothèses d’un produit.



\---



\## Auteur



\*\*Julien Messaoudi\*\*  

Étudiant ingénieur en cybersécurité — ESIEE Paris



Orientation : GRC, analyse de risques, conformité SSI, cybersécurité et développement d’outils d’audit.



\- GitHub : https://github.com/JulienMessaoudi

\- LinkedIn : https://www.linkedin.com/in/julien-messaoudi



\---



\## Licence et usage



GapTrack est un projet réalisé à des fins académiques, de démonstration, d’apprentissage et d’expérimentation produit.



La publication du code source ne vaut pas automatiquement autorisation d’utiliser le projet, son identité visuelle ou ses contenus dans un contexte commercial. Les conditions applicables doivent être vérifiées dans les fichiers de licence du dépôt.



Aucune donnée sensible réelle ne doit être utilisée dans la version publique sans mesures de sécurité, garanties contractuelles et validation préalable adaptées.



Les résultats produits par GapTrack sont indicatifs. Ils ne remplacent ni un audit professionnel, ni une analyse juridique, ni une décision d’homologation ou de certification.

