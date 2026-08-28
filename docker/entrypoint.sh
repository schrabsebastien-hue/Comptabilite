#!/bin/sh
set -e

# S'assurer que le fichier SQLite existe si la connexion est SQLite
if [ "$DB_CONNECTION" = "sqlite" ]; then
    mkdir -p /var/www/html/database
    touch /var/www/html/database/database.sqlite
    chown -R www-data:www-data /var/www/html/database
fi

# Ajuster les permissions des dossiers de stockage et de cache
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Exécuter les migrations de base de données
php artisan migrate --force

# Mettre en cache la configuration et les routes si APP_KEY est défini
if [ -n "$APP_KEY" ]; then
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
fi

exec "$@"
