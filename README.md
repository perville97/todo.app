# Todo App (IndexedDB)
Projets + tâches (ajout, modification, statut, suppression), stockés dans IndexedDB.

    npm install      # installe aussi le hook git pre-push
    npm test         # tests BDD + interface
    npm start        # sert l'app sur http://localhost:3000

Tests déclenchés à chaque `git push` :
- en local : hook `.githooks/pre-push` (le push est bloqué si un test échoue)
- sur GitHub : workflow `.github/workflows/tests.yml`
