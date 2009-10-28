#!/bin/bash
VER="0.8"
cp ../src/jquery.nub.js .
cp ../src/jquery.nub-frames.js .
./minify.sh jquery.nub.js
./minify.sh jquery.nub-frames.js
tar zcvf jquery.nub.$VER.tgz *js
zip jquery.nub.$VER.zip *js
mv *.js ../dist
mv jquery.nub.$VER.tgz ../dist
mv jquery.nub.$VER.zip ../dist
