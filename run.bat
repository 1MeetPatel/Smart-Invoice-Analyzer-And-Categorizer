@echo off
title Smart Invoice Analyzer
echo ========================================
echo   Smart Invoice Analyzer & Categorizer
echo ========================================
echo.

:: Create necessary directories
if not exist "uploads" mkdir uploads
if not exist "exports" mkdir exports

:: Install dependencies
echo Installing dependencies...
pip install -r requirements.txt
echo.

:: Start Flask server
echo Starting server at http://localhost:5000
echo.
start http://localhost:5000
python app.py

pause
