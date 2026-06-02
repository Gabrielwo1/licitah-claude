#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Licitah — Setup do Worker na VPS Hostinger (Ubuntu 22.04)
# Execute como root ou com sudo:  bash setup-vps.sh
# ─────────────────────────────────────────────────────────────
set -e

echo "==> [1/6] Atualizando pacotes..."
apt-get update -y && apt-get upgrade -y

echo "==> [2/6] Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git

echo "==> [3/6] Instalando PM2 globalmente..."
npm install -g pm2

echo "==> [4/6] Criando diretório do worker..."
mkdir -p /opt/licitah-worker/logs
cd /opt/licitah-worker

echo "==> [5/6] Instalando dependências e Playwright..."
# Copia arquivos do worker (ajuste o caminho se clonar o repo inteiro)
# Se o repositório está em /opt/licitah-claude:
cp -r /opt/licitah-claude/worker/* /opt/licitah-worker/
npm install
npx playwright install chromium
npx playwright install-deps chromium

echo "==> [6/6] Compilando TypeScript..."
npm run build

echo ""
echo "✅ Setup concluído!"
echo ""
echo "Agora configure as variáveis de ambiente:"
echo "  nano /opt/licitah-worker/.env"
echo ""
echo "Conteúdo do .env:"
echo "  APP_URL=https://SEU-DOMINIO.vercel.app"
echo "  WORKER_SECRET=sua_chave_secreta_longa"
echo "  WORKER_ID=vps-hostinger-1"
echo ""
echo "Depois inicie o worker:"
echo "  cd /opt/licitah-worker && pm2 start ecosystem.config.js"
echo "  pm2 save && pm2 startup"
