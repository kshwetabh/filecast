@echo off
cd /d "%~dp0"
rem Stop an older running filecast (Windows locks running exes, which breaks the build)
taskkill /IM filecast.exe /F >nul 2>&1
rem Find the zig toolchain folder (any version)
for /d %%d in (zig-*) do set "ZIGDIR=%%d"
if not defined ZIGDIR (
  echo zig not found. Download it from https://ziglang.org/download
  echo and extract it into this folder, then run this again.
  pause
  exit /b 1
)
set PATH=%CD%\%ZIGDIR%;%PATH%
set SCRIPTC_CC=zigcc
call node_modules\.bin\scriptc build filecast.ts -o filecast.exe
echo.
echo Build done. Double-click filecast.exe to serve.
pause
