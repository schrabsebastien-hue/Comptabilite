# Mémo : Procédure de Modification et Mise en Production

Ce document détaille les étapes à suivre pour effectuer une modification sur l'application, la versionner, et la déployer sur le serveur de production.

## 1. Préparation de l'environnement Local

Avant de commencer toute modification, assurez-vous de partir d'une base saine et à jour.

### Création d'une branche de travail
Il est recommandé de ne jamais travailler directement sur la branche `main`. Créez toujours une branche dédiée à votre fonctionnalité ou correctif.

```bash
# Se placer sur la branche principale
git checkout main

# Récupérer les dernières mises à jour du dépôt distant
git pull origin main

# Créer une nouvelle branche (ex: ajout-nouvelle-page, fix-bug-login)
# Note : Cette commande crée la branche uniquement sur votre ordinateur (local).
# Elle ne sera créée sur le serveur (remote) qu'au moment du "git push" (voir étape 3).
git checkout -b nom-de-votre-branche
```

## 2. Développement et Tests Locaux

Effectuez vos modifications dans le code.

### Commandes utiles durant le développement
Si vous modifiez des fichiers de configuration ou des vues, pensez à vider les caches locaux si nécessaire :
```bash
php artisan optimize:clear
```

Avant de valider, assurez-vous que tout fonctionne localement (serveur de dev lancé via `npm run dev` et `php artisan serve`).

## 3. Versionnage (Git Flow)

Une fois vos modifications terminées et testées :

### Validation des changements
```bash
# Ajouter les fichiers modifiés
git add .

# Créer un commit avec un message clair
git commit -m "Description précise de la modification"
```

### Envoi sur le dépôt distant (GitHub/GitLab)
```bash
git push origin nom-de-votre-branche
```

### Fusion vers la branche principale (Main)
Une fois votre branche prête, fusionnez-la vers `main` pour préparer le déploiement.

*Option A : Via une Pull Request (Recommandé si vous utilisez GitHub/GitLab)*
1. Allez sur l'interface web de votre dépôt.
2. Créez une Pull Request de `nom-de-votre-branche` vers `main`.
3. Validez et fusionnez ("Merge").

*Option B : Fusion Locale*
```bash
# Retourner sur main
git checkout main

# Mettre à jour main (au cas où)
git pull origin main

# Fusionner votre branche
git merge nom-de-votre-branche

# Pousser la version fusionnée vers le serveur
git push origin main
```

## 4. Déploiement sur le Serveur de Production

Une fois que les modifications sont fusionnées sur la branche `main` du dépôt distant, vous pouvez déployer.

### Connexion au Serveur
Connectez-vous via SSH à votre serveur de production.
```bash
ssh sebastien@192.168.1.35
```

### Lancement du Déploiement
Naviguez vers le dossier du projet et lancez le script de déploiement. Ce script s'occupe de tout : récupération du code, installation des dépendances, build des assets, et migrations.

```bash
# Aller dans le dossier du projet (chemin à adapter si différent)
cd /var/www/laravel-app/laravel-app

# (Optionnel) Vérifier que vous êtes bien sur la branche main
git checkout main

# Exécuter le script de déploiement
./deploy.sh
```

### Ce que fait `deploy.sh` automatiquement :
1. **Git Pull** : Récupère la dernière version du code depuis `main`.
2. **Composer Install** : Installe/Mise à jour des dépendances PHP.
3. **NPM Install & Build** : Compile les assets JS/CSS (Vite).
4. **Artisan Migrate** : Joue les migrations de base de données (si nouvelles migrations).
5. **Optimisation** : Vide et reconstruit les caches (config, routes, vues).

### Vérification
Une fois le script terminé (message "✅ Déploiement terminé avec succès !"), vérifiez le bon fonctionnement de l'application dans votre navigateur.

## 5. Nettoyage (Optionnel mais recommandé)

Après un déploiement réussi, pour garder votre environnement propre :

### Suppression de la branche locale
```bash
# S'assurer d'être sur main
git checkout main

# Supprimer la branche de votre ordinateur
git branch -d nom-de-votre-branche
```

### Suppression de la branche distante (GitHub/GitLab) (Si fusionnée)
Si vous avez utilisé une Pull Request, GitHub propose souvent de supprimer la branche automatiquement. Sinon :
```bash
git push origin --delete nom-de-votre-branche
```

## 6. Dépannage

### Erreur "Permission denied" lors du déploiement

Si le script `deploy.sh` échoue avec des erreurs du type :
```
error: unable to unlink old 'laravel-app/storage/.../.gitignore': Permission denied
fatal: Could not reset index file to revision 'HEAD'.
```

Cela signifie que les fichiers ont été modifiés par le conteneur Docker (avec l'utilisateur `www-data`) et que vous n'avez plus les droits de les modifier.

**Solution :** Exécutez la commande suivante pour reprendre la propriété des fichiers :
```bash
sudo chown -R sebastien:sebastien /var/www/laravel-app/laravel-app
```

Puis relancez le déploiement :
```bash
./deploy.sh
```

> **Note :** Le script `deploy.sh` inclut désormais une correction automatique des permissions avant le `git pull`, mais cette commande manuelle peut être utile si le script échoue avant d'atteindre cette étape.
