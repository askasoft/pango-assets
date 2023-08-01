@echo off

REM npm install -g uglify-js clean-css-cli

set BASEDIR=%~dp0
set HTMLDIR=%BASEDIR%\html

cd /d %HTMLDIR%\datetimepicker\
call :mincss bootstrap-datetimepicker

cd /d %HTMLDIR%\plugins\css\
copy /b *.*.css plugins.css 
call :mincss plugins


cd /d %HTMLDIR%\corejs\
copy /b core.*.js corejs.js
call :minjs corejs

cd /d %HTMLDIR%\datetimepicker\
call :minjs bootstrap-datetimepicker

cd /d %HTMLDIR%\plugins\js\
copy /b *.*.js plugins.js 
call :minjs plugins


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
