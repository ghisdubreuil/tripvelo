# Back des dégustations (Google Apps Script)

L’onglet **Dégust.** de `index.html` enregistre tout sur le téléphone, puis synchronise
avec ce back dès qu’il est configuré : tout le groupe voit alors les mêmes bouteilles,
les mêmes notes et le même classement.

- Données : une Google Sheet, onglets « Bouteilles » et « Notes » (lisibles directement).
- Photos : un dossier Google Drive « Vinlo 2026 · Photos des bouteilles ».

## Installation (5 minutes)

1. Va sur <https://script.google.com>, **Nouveau projet**.
2. Remplace le contenu de `Code.gs` par celui de `degustations.gs`.
3. Choisis la fonction `setup` dans la barre d’outils, clique **Exécuter** et accepte les
   autorisations. Le journal affiche l’adresse de la Google Sheet créée.
4. **Déployer > Nouveau déploiement**, type **Application Web** :
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
5. Copie l’URL qui se termine par `/exec`.
6. Colle-la dans `index.html`, constante `DG_API` (tout le groupe en profite), ou dans
   l’app : **Dégust. > ⚙️ Réglages > Adresse du serveur** (pour ce téléphone seulement).

Le jeton `TOKEN` du script doit rester identique à `DG_TOKEN` dans `index.html`.

Après une modification du script : **Déployer > Gérer les déploiements > Modifier >
Nouvelle version**, pour garder la même URL.
