#!/bin/bash
echo "enter the location of jsio"
read jsio
jsio_compile orbited.pkg --vv -j $jsio -o ../static/Orbited.js
