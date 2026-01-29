@echo off
echo ================================
echo   Building Akai Windows Installer
echo ================================
echo.
echo Installing dependencies...
call npm install
echo.
echo Building app...
call npm run electron:build:win
echo.
echo ================================
echo   Build complete!
echo   Installer is in: dist/
echo ================================
pause
