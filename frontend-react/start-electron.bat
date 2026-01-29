@echo off
echo ================================
echo   Akai Desktop App (Dev Mode)
echo ================================
echo.
echo Installing dependencies...
call npm install
echo.
echo Starting Electron app...
call npm run electron:dev
pause
