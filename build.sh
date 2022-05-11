#!/bin/bash -e

# npm install -g uglify-js clean-css-cli

BASEDIR=$(dirname $(readlink -f $0))

minjs() {
	echo --------------------------------------
	echo --  minify js: $1
	uglifyjs $1.js --warn --compress --mangle --source-map url=$1.min.js.map -o $1.min.js
}

mincss() {
	echo --------------------------------------
	echo --  minify css: $1
	cleancss -d -o $1.min.css $1.css
}

cd $BASEDIR/html/datetimepicker/
mincss bootstrap-datetimepicker

cd $BASEDIR/html/jquery/css/
cat jquery.*.css > jquery-plugins.css 
mincss jquery-plugins

cd $BASEDIR/html/lightbox/
mincss jquery.ui.lightbox

cd $BASEDIR/html/simplecolorpicker/
mincss jquery.ui.simple-color-picker


cd $BASEDIR/html/corejs/
cat core.*.js > corejs.js
minjs corejs

cd $BASEDIR/html/datetimepicker/
minjs bootstrap-datetimepicker

cd $BASEDIR/html/jquery/js/
cat jquery.*.js > jquery-plugins.js 
minjs jquery-plugins

cd $BASEDIR/html/lightbox/
minjs jquery.ui.lightbox

cd $BASEDIR/html/simplecolorpicker
minjs jquery.ui.simple-color-picker

echo --------------------------------------
echo DONE.
echo 
