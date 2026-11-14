# Application To-Do — JavaScript, IndexedDB et tests

Gestion de projets et tâches (titre, échéance, déplacement, annulation d’édition, achèvement et progression), sauvegardée dans IndexedDB.

## Installation et commandes

    npm ci              # installe les dépendances et active .githooks/pre-push
    npm start           # sert l’application
    npm run test:tdd    # Vitest, contrats, oracles pairwise et couverture
    npm run test:bdd    # Cucumber en français + Playwright/Chrome
    npm test            # TDD puis BDD
    npm run test:mutation # Stryker (exécuté automatiquement uniquement la nuit en CI)

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

## Historique TDD et hooks

Chaque cycle TDD (spécification rouge puis implémentation verte) est enregistré dans l’historique Git. Le hook versionné `.githooks/pre-push`, installé par `npm install`/`npm ci`, exécute d’abord TDD puis BDD et bloque le push si l’un échoue. GitHub Actions répète les tests à chaque push et pull request, publie les rapports même en cas d’échec et réserve Stryker à l’exécution nocturne.
# todo.app
