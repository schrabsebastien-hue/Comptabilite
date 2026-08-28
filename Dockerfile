# Étape 1 : Build du frontend (Vite / React)
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Étape 2 : Production PHP 8.4 + Nginx
FROM php:8.4-fpm-alpine

ENV COMPOSER_ALLOW_SUPERUSER=1

# Installation des dépendances système et des extensions PHP requises
RUN apk add --no-cache \
    nginx \
    supervisor \
    curl \
    git \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    icu-dev \
    oniguruma-dev \
    zip \
    unzip \
    sqlite-dev

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo \
        pdo_sqlite \
        pdo_mysql \
        gd \
        zip \
        intl \
        bcmath \
        opcache

# Récupération de Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copie du code de l'application
COPY . /var/www/html

# Copie du build frontend depuis l'étape 1
COPY --from=frontend-builder /app/public/build /var/www/html/public/build

# Installation des dépendances Composer de production
RUN composer install --no-dev --no-scripts --optimize-autoloader --no-interaction

# Permissions initiales
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Configurations personnalisées
COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
