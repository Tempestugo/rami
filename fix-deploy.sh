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
PassengerStartupFile start.cjs
# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION END
Options -Indexes
PassengerRestartDir /home/u556180082/domains/ramimandirim.com.br/nodejs/tmp
SetEnv NODE_OPTIONS "--require /home/u556180082/domains/ramimandirim.com.br/public_html/.builds/config/preload-timestamp.cjs"
SetEnv LSNODE_CONSOLE_LOG console.log
RewriteRule ^\.builds - [F,L]
HTEOF

echo "=== Corrigindo preload ==="
mkdir -p $PRELOAD_DIR
echo "// preload" > $PRELOAD_DIR/preload-timestamp.cjs
rm -f $PRELOAD_DIR/preload-timestamp.js

echo "=== Restart ==="
mkdir -p $NODEJS/tmp
touch $NODEJS/tmp/restart.txt

echo "=== Pronto! ==="
