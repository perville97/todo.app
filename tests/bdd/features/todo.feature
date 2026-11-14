# language: fr
@todo @indexeddb
Fonctionnalité: Organiser les tâches par projet
  Les projets et les tâches sont conservés dans IndexedDB du navigateur.

  Contexte:
    Étant donné que j’ouvre l’application

  @projets
  Scénario: Créer un projet et refuser un nom déjà pris sans tenir compte de la casse
    Quand je crée le projet "Maison"
    Et je crée le projet "maison"
    Alors un seul projet "Maison" est affiché
    Et une erreur de projet est affichée

  @progression @outline
  Plan du scénario: Ajouter une tâche avec une échéance et afficher la progression
    Quand je crée le projet "Personnel"
    Et j’ajoute la tâche "<titre>" avec l’échéance "<échéance>"
    Alors la tâche "<titre>" est affichée
    Et le compteur affiche "1 à faire sur 1"
    Quand je marque la tâche "<titre>" comme terminée
    Alors le compteur affiche "0 à faire sur 1"
    Et la progression affiche "100 %"
    Et l’échéance de la tâche est "<échéance>"

    Exemples:
      | titre            | échéance   |
      | Préparer le repas | 2032-01-15 |
      | Réviser demain    | 2032-02-29 |

  @modification
  Scénario: Modifier une tâche puis annuler une autre modification
    Quand je crée le projet "Lecture"
    Et j’ajoute la tâche "Lire un chapitre" sans échéance
    Et je modifie la tâche "Lire un chapitre" en "Lire deux chapitres" avec l’échéance "2032-03-10"
    Alors la tâche "Lire deux chapitres" est affichée
    Et l’échéance de la tâche est "2032-03-10"
    Quand je commence à modifier la tâche "Lire deux chapitres"
    Et je saisis le titre "Changement annulé"
    Et j’annule la modification
    Alors la tâche "Lire deux chapitres" est affichée
    Et la tâche "Changement annulé" n’est pas affichée

  @deplacement
  Scénario: Déplacer une tâche vers un autre projet sans perdre la tâche
    Quand je crée le projet "Maison"
    Et j’ajoute la tâche "Ranger" sans échéance
    Et je crée le projet "Travail"
    Et je sélectionne le projet "Maison"
    Et je modifie le projet de la tâche "Ranger" vers "Travail"
    Alors la tâche "Ranger" n’est pas affichée
    Quand je sélectionne le projet "Travail"
    Alors la tâche "Ranger" est affichée
    Et le compteur affiche "1 à faire sur 1"

  @persistance @reload
  Scénario: Conserver les données après rechargement
    Quand je crée le projet "Durable"
    Et j’ajoute la tâche "À garder" sans échéance
    Quand je recharge la page
    Alors le projet "Durable" est affiché
    Et la tâche "À garder" est affichée

  @persistance @onglet
  Scénario: Conserver les données après fermeture puis réouverture de l’onglet
    Quand je crée le projet "Archive"
    Et j’ajoute la tâche "Toujours là" sans échéance
    Quand je ferme puis rouvre l’onglet
    Alors le projet "Archive" est affiché
    Et la tâche "Toujours là" est affichée
