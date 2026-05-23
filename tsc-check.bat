@echo off
node_modules\.bin\tsc --noEmit > tsccheck.txt 2>&1
echo EXIT=%ERRORLEVEL%
findstr /I "error TS" tsccheck.txt
echo ---DONE---
