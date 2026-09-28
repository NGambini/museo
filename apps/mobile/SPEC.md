# Audioguide app

L'objet de cette application est de generer facilement des audioguides pour n'importe quel lieu, a destination des enfants. 

## Ecrans

En version MVP, l’application sera composée de trois onglets accessibles via la barre de navigation en bas :
	•	Explore : permet de saisir un lieu pour générer un audioguide, ou de consulter les points d’intérêt à proximité sur une carte et/ou sous forme de liste.
	•	Guide : le cœur de l’application, avec la vue dédiée à l’audioguide.
	•	History : un historique des audioguides générés.

Pour le moment, l’application ne comprendra pas de pages de connexion ou d’inscription.

## Conventions

### Screens versus components

On appellera Screen un composant directement rendu par le routeur (une “page”), tandis que Component désignera un composant réutilisable, indépendant du routing.

### Smart-dumb components

Pour chaque screen, on aura sous-composant suffixé View qui contiendra juste la vue. Et un parent qui contiendra le code metier et le data fetching. Par exemple HomeScreen/HomeScreenView.


