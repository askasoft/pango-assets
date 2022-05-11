@echo off

REM npm install -g uglify-js clean-css-cli

set BASEDIR=%~dp0

cd /d %BASEDIR%\html\datetimepicker\
call :mincss bootstrap-datetimepicker

cd /d %BASEDIR%\html\jquery\css\
copy /b jquery.*.css jquery-plugins.css 
call :mincss jquery-plugins


cd /d %BASEDIR%\html\corejs\
copy /b core.*.js corejs.js
call :minjs corejs

cd /d %BASEDIR%\html\datetimepicker\
call :minjs bootstrap-datetimepicker

cd /d %BASEDIR%\html\jquery\js\
copy /b jquery.*.js jquery-plugins.js 
call :minjs jquery-plugins


echo --------------------------------------
echo DONE.

cd /d %BASEDIR%
exit /b


:minjs
echo --------------------------------------
echo --  minify js: %1
call uglifyjs.cmd %1.js --warn --compress --mangle --source-map url=%1.min.js.map -o %1.min.js
exit /b

:mincss
echo --------------------------------------
echo --  minify css: %1
call cleancss.cmd -d -o %1.min.css %1.css
exit /b
