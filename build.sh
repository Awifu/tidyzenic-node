#!/bin/bash

# Ensure tools are installed
if ! command -v html-minifier &> /dev/null || ! command -v terser &> /dev/null
then
    echo "Installing required tools..."
    npm install -g html-minifier terser
fi

echo "🔧 Minifying HTML and JS files..."

# Set paths
SRC_HTML="public/admin/support.html"
DEST_HTML="public/admin/support.min.html"

SRC_JS="public/admin/js/support-page.js"
DEST_JS="public/admin/js/support-page.min.js"

# Minify HTML
html-minifier --collapse-whitespace --remove-comments --minify-css true --minify-js true -o "$DEST_HTML" "$SRC_HTML"
echo "✅ Minified HTML: $DEST_HTML"

# Minify JS
terser "$SRC_JS" -o "$DEST_JS" -c -m
echo "✅ Minified JS: $DEST_JS"

echo "🎉 Build complete!"
