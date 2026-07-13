#!/bin/bash
# ==============================================================================
#  hostinger-deploy.sh
#  Roda ANTES do servidor Node. Faz git pull + build.
#  Configure no painel da Hostinger como startup command:
#    bash hostinger-deploy.sh && node server.js
# ==============================================================================

set -e

echo "[deploy] Iniciando deploy Hostinger..."

# Garante que o npm correto está no PATH
export PATH="/opt/alt/alt-nodejs18/root/usr/bin:$PATH"
NPM="/opt/alt/alt-nodejs18/root/usr/bin/npm"

echo "[deploy] Node: $(node -v)"
echo "[deploy] npm: $($NPM -v)"

# Instala dependências (sem scripts de pós-install que podem falhar)
echo "[deploy] Instalando dependências..."
$NPM install --ignore-scripts

# Corrige permissões de executáveis (workaround Hostinger)
echo "[deploy] Corrigindo permissões..."
chmod +x node_modules/.bin/* 2>/dev/null || true
chmod +x node_modules/@esbuild/linux-x64/bin/esbuild 2>/dev/null || true

# Compila o frontend React
echo "[deploy] Compilando frontend..."
PATH="/opt/alt/alt-nodejs18/root/usr/bin:$PATH" $NPM run build

# Executa script de fix adicional se existir
if [ -f "$HOME/fix-deploy.sh" ]; then
  echo "[deploy] Rodando fix-deploy.sh..."
  bash "$HOME/fix-deploy.sh" || true
fi

echo "[deploy] Deploy concluido com sucesso!"
