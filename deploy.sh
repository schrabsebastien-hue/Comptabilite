#!/bin/bash

# Script de déploiement pour la production (Docker)
# Usage: ./deploy.sh

# Arrêter le script dès qu'une commande échoue
set -e

echo "🚀 Démarrage du déploiement de Comptabilité..."

# 1. Vérification du dossier racine du projet
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Erreur: docker-compose.yml introuvable. Exécutez ce script depuis la racine du projet."
    exit 1
fi

# 2. Récupération du code le plus récent via Git
echo "📥 1. Git Pull (Récupération du code)..."
# Réinitialiser les modifications locales pour éviter tout conflit lors du pull
git reset --hard HEAD
git pull origin main

# 3. Build de l'image Docker (Inertia/Vite + PHP) et démarrage des conteneurs
echo "🐳 2. Build Docker & Redémarrage du conteneur..."
docker compose up -d --build

# 4. Exécution des migrations de base de données
echo "🗄️ 3. Exécution des migrations de base de données..."
docker compose exec -T app php artisan migrate --force

# 5. Lien symbolique du stockage de fichiers
echo "🔗 4. Vérification des liens de stockage..."
docker compose exec -T app php artisan storage:link || true

# 6. Optimization des caches Laravel
echo "🧹 5. Mise en cache de la configuration, des routes et des vues..."
docker compose exec -T app php artisan config:cache
docker compose exec -T app php artisan route:cache
docker compose exec -T app php artisan view:cache

# 7. Redémarrage des files d'attente (Queues)
echo "🔄 6. Redémarrage des Queue Workers..."
docker compose exec -T app php artisan queue:restart || true

# 8. Correction des permissions de stockage
echo "🔧 7. Ajustement des permissions (storage & cache)..."
docker compose exec -T app chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

echo "✅ Déploiement de Comptabilité terminé avec succès !"
