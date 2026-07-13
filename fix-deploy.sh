#!/bin/bash
DOMAIN=~/domains/ramimandirim.com.br
NODEJS=$DOMAIN/nodejs
PRELOAD_DIR=$DOMAIN/public_html/.builds/config

echo "=== Corrigindo .htaccess ==="
cat > $DOMAIN/public_html/.htaccess << 'HTEOF'
# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION BEGIN
PassengerAppRoot /home/u556180082/domains/ramimandirim.com.br/nodejs
PassengerBaseURI /
PassengerNodejs /opt/alt/alt-nodejs18/root/bin/node
PassengerAppType node
PassengerStartupFile server.js
# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION END
Options -Indexes
PassengerRestartDir /home/u556180082/domains/ramimandirim.com.br/nodejs/tmp
SetEnv NODE_OPTIONS "--require /home/u556180082/domains/ramimandirim.com.br/public_html/.builds/config/preload-timestamp.js"
SetEnv LSNODE_CONSOLE_LOG console.log
RewriteRule ^\.builds - [F,L]
HTEOF

echo "=== Corrigindo preload ==="
mkdir -p $PRELOAD_DIR
echo "// preload" > $PRELOAD_DIR/preload-timestamp.cjs
echo "// preload" > $PRELOAD_DIR/preload-timestamp.js

echo "=== Corrigindo type:module ==="
/opt/alt/alt-nodejs18/root/usr/bin/node -e "
const fs=require('fs');
const p='/home/u556180082/domains/ramimandirim.com.br/public_html/.builds/config/package.json';
try {
  let pkg=JSON.parse(fs.readFileSync(p,'utf8'));
  delete pkg.type;
  fs.writeFileSync(p,JSON.stringify(pkg,null,2));
  console.log('OK: type:module removido');
} catch(e) { console.log('Aviso:',e.message); }
"

echo "=== Restart ==="
mkdir -p $NODEJS/tmp
touch $NODEJS/tmp/restart.txt

echo "=== Pronto! ==="
