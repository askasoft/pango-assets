#!/bin/bash -e

# npm install -g uglify-js clean-css-cli

BASEDIR=$(dirname $(readlink -f $0))
HTMLDIR=$BASEDIR/html

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

cd $HTMLDIR/datetimepicker/
mincss bootstrap-datetimepicker

cd $HTMLDIR/plugins/css/
cat jquery.*.css    >  plugins.css
cat bootstrap.*.css >> plugins.css
cat ui.*.css        >> plugins.css
mincss plugins


cd $HTMLDIR/corejs/
cat core.*.js > corejs.js
minjs corejs

cd $HTMLDIR/datetimepicker/
minjs bootstrap-datetimepicker

cd $HTMLDIR/plugins/js/
cat jquery.*.js    >  plugins.js
cat bootstrap.*.js >> plugins.js
minjs plugins


echo --------------------------------------
echo DONE.
echo 
