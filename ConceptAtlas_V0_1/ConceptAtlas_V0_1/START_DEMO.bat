@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel% equ 0 (
  py -3 launch.py --demo
) else (
  python launch.py --demo
)
if errorlevel 1 pause
