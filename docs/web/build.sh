#!/bin/bash
if [ -z $1 ]; then
    echo "No output directory specified."
    echo "Usage: build.sh <output directory>"
    exit 0
fi
if [ -e $1 ]; then
    if [ ! -d $1 ]; then
        echo "Target must be a directory."
        exit 1
    fi
else
    echo "Creating target directory $1"
    mkdir $1
fi

cp -R * $1
cd $1
xsltproc table-layout.xsl site.xml
echo "Done."
