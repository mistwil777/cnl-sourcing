#!/bin/bash
set -e

VPS_USER=root
VPS_IP=51.158.109.135
VPS_DIR=/opt/cnl-sourcing
DOMAIN=cnlsourcing.com
EMAIL=cnlsourcingvn@gmail.com

# ÉTAPE 1 : Copier .env.production sur le VPS
scp .env.production $VPS_USER@$VPS_IP:$VPS_DIR/.env

# ÉTAPE 2 : Sur le VPS — installer Certbot et générer le SSL
ssh $VPS_USER@$VPS_IP << 'REMOTE'
  apt-get update -qq
  apt-get install -y certbot
  # Arrêter nginx si actif
  docker stop cnl_nginx 2>/dev/null || true
  # Générer le certificat
  certbot certonly --standalone \
    -d cnlsourcing.com -d www.cnlsourcing.com \
    --non-interactive --agree-tos -m cnlsourcingvn@gmail.com
  # Copier les certs dans le dossier nginx/ssl du projet
  mkdir -p /opt/cnl-sourcing/nginx/ssl
  cp /etc/letsencrypt/live/cnlsourcing.com/fullchain.pem \
     /opt/cnl-sourcing/nginx/ssl/
  cp /etc/letsencrypt/live/cnlsourcing.com/privkey.pem \
     /opt/cnl-sourcing/nginx/ssl/
REMOTE

# ÉTAPE 3 : Sur le VPS — git pull + docker compose prod
ssh $VPS_USER@$VPS_IP << 'REMOTE'
  cd /opt/cnl-sourcing
  git pull origin main
  docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    up -d --build
  docker compose ps
REMOTE

# ÉTAPE 4 : Cron renouvellement SSL (lundi 3h)
ssh $VPS_USER@$VPS_IP << 'REMOTE'
  (crontab -l 2>/dev/null; echo "0 3 * * 1 certbot renew --quiet && \
    cp /etc/letsencrypt/live/cnlsourcing.com/fullchain.pem \
       /opt/cnl-sourcing/nginx/ssl/ && \
    cp /etc/letsencrypt/live/cnlsourcing.com/privkey.pem \
       /opt/cnl-sourcing/nginx/ssl/ && \
    docker exec cnl_nginx nginx -s reload") | crontab -
REMOTE

echo "Déploiement terminé — https://cnlsourcing.com"
