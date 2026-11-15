# Application To-Do — JavaScript, IndexedDB et tests

Gestion de projets et tâches (titre, échéance, déplacement, annulation d’édition, achèvement et progression), sauvegardée dans IndexedDB.

## Installation et commandes (ordre d’exécution)

Depuis un terminal ouvert à la racine du dépôt :

1. Installer les dépendances et activer le hook Git pre-push :

    npm ci

2. Une seule fois par machine, installer Chromium pour les tests BDD :

    npx playwright install chromium

3. Lancer tous les tests avant de démarrer ou publier l’application :

    npm test

   `npm test` lance d’abord Vitest avec couverture, puis les scénarios BDD Cucumber + Playwright/Chrome. Résultat vert = les deux commandes réussissent.

4. Démarrer l’application dans un terminal dédié :

    npm start

   Ouvrir `http://localhost:3000` sur cet ordinateur. Pour un autre appareil du même réseau Wi-Fi, trouver l’adresse avec `hostname -I`, puis ouvrir `http://ADRESSE_IP:3000` (par exemple `http://192.168.1.25:3000`). Le pare-feu doit autoriser le port 3000.

5. Après des changements, vérifier puis enregistrer le travail :

    npm test
    git add .
    git commit -m "Décrire le changement"
    git push

   Au `git push`, le hook `.githooks/pre-push` relance Vitest puis BDD : un échec bloque l’envoi. Un `git commit` seul ne déclenche pas le hook. GitHub Actions rejoue aussi les tests après réception du push et sur les pull requests.

Commandes de test séparées si besoin :

    npm run test:tdd       # Vitest, contrats, oracles pairwise et couverture
    npm run test:bdd       # Cucumber en français + Playwright/Chrome
    npm run test:bdd:headed # mêmes parcours, Chrome visible et ralenti pour la démonstration
    npm run test:mutation  # Stryker ; en CI, uniquement la nuit

Pour montrer le test à l’enseignant, lance `npm run test:bdd:headed` dans un terminal graphique : Chrome s’ouvre et Playwright saisit les données/clique automatiquement. Les tests restent automatisés ; ne remplis pas les champs à la main. Le mode normal `npm run test:bdd` reste invisible et convient au hook Git/CI. Sur un serveur sans écran graphique, utilise le mode normal.

Dans ton dépôt actuel, `origin` et le suivi de la branche `main` sont déjà configurés : ne refais pas `git remote add`. Pour une copie neuve clonée depuis GitHub, le remote est ajouté automatiquement par `git clone`.

Le générateur pairwise déterministe vérifie explicitement la complétude du jeu de données. Tous les cas de validation du service et les oracles associés sont générés par ce jeu. Les tests de contrat sont exécutés contre le fake mémoire et le dépôt IndexedDB (fake-indexeddb).

## Architecture

- `src/rules.js` : règles pures et compteurs.
- `src/service.js` : cas d’usage, avec dépôt, horloge et générateur d’identifiants injectés.
- `src/memory-repository.js` : fake mémoire de test.
- `src/db.js` : dépôt navigateur IndexedDB.
- `tests/bdd/features/todo.feature` : scénarios Gherkin français ; un contexte Chrome neuf par scénario, locale `fr-FR`, fuseau `Europe/Paris`, stockage IndexedDB isolé.

## Voir le mécanisme dans l’application

Dans la page, descendez sous la liste des tâches jusqu’au panneau **Voir le mécanisme**. Les boutons « Créer un projet », « Ajouter une tâche », « Modifier / déplacer » et « Terminer » affichent le trajet d’une action : événement du formulaire → règles/service métier → dépôt IndexedDB → mise à jour de l’interface. Cette visualisation est pédagogique et ne crée/modifie aucune donnée.

Le bloc **Et les tests au push ?** explique le hook : `git push` → `.githooks/pre-push` → `npm run test:tdd` → `npm run test:bdd` → push autorisé si tout passe, sinon annulé. `git commit` seul ne déclenche pas `pre-push`. Pour voir les résultats sans envoyer du code vers un dépôt distant, utilisez `npm test`.

Dans Chrome, **F12 → Application → IndexedDB → todo-db** permet d’inspecter les stores `projects` et `tasks`. Le rapport de couverture s’ouvre via [coverage/index.html](coverage/index.html), et le rapport BDD via [reports/cucumber.html](reports/cucumber.html).

## Résultats et pourcentages dans l’interface

Le panneau **Résultats des tests**, sous les tâches, lit `test-results.json` et affiche les comptes TDD/BDD, les pourcentages de couverture (lignes, branches, fonctions) et le score Stryker, avec le nombre de mutants tués, survivants et non couverts. Après `npm test` ou `npm run test:mutation`, les scripts reconstruisent le résumé et le bouton **Actualiser** recharge les mesures.

Les tests de mutation ne tournent pas à chaque push : GitHub Actions les lance à l’horaire nocturne du workflow. Pour actualiser localement cette partie, lancer `npm run test:mutation` (cela prend plusieurs minutes). Les rapports complets sont dans `reports/mutation/`; GitHub Actions publie également les rapports JSON/HTML comme artifacts téléchargeables dans l’exécution du workflow.

## Historique TDD et hooks

Chaque cycle TDD (spécification rouge puis implémentation verte) est enregistré dans l’historique Git. Le hook versionné `.githooks/pre-push`, installé par `npm install`/`npm ci`, exécute d’abord TDD puis BDD et bloque le push si l’un échoue. GitHub Actions répète les tests à chaque push et pull request, publie les rapports même en cas d’échec et réserve Stryker à l’exécution nocturne.
# todo.app
