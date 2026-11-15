# language: fr
@rapports @dashboard
Fonctionnalité: Consulter les résultats des tests dans le navigateur
  Les mesures viennent des rapports produits par les commandes de test.

  Scénario: Afficher les résultats TDD et les pourcentages de couverture
    Étant donné que j’ouvre l’application
    Alors le tableau des résultats des tests est affiché
    Et les tests TDD sont indiqués comme réussis
    Et le pourcentage de couverture des lignes est visible
