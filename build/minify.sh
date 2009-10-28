#!/bin/bash
# Minify source JavaScript files.
# Usage: minify.sh <file> [target]
# 'target' is optional, and if not supplied the script will attempt to construct an output filename.
# For example, 'example.js' will be output to 'example.min.js'.
OUT=$2
if [ ! "$OUT" ]; then
    OUT=$(echo $1|sed -e "s/\(.*\)\.js/\1.min.js/")
    if [ "$1" = "$OUT" ]; then
        # Filename doesn't end with '.js'
        # Append '.min' rather than overwrite the source file.
        OUT="$OUT.min"
    fi
fi
echo "Minifying to $OUT..."
java -jar yuicompressor-2.4.2.jar --nomunge $1>$OUT
