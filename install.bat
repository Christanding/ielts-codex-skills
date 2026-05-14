@echo off
setlocal EnableExtensions

rem IELTS Skills V1.0 - Windows installer for Codex.
rem Copies skills to %USERPROFILE%\.codex\skills.

set "SRC=%~dp0"
set "DST=%USERPROFILE%\.codex\skills"
set "FAIL=0"

echo.
echo === IELTS Skills V1.0 install ===
echo.
echo Source: %SRC%
echo Target: %DST%
echo.

if not exist "%DST%" mkdir "%DST%"
if errorlevel 1 (
  echo [FAIL] cannot create target directory
  pause
  exit /b 1
)

set "SKILLS=ielts ielts-diagnose ielts-writing ielts-reading ielts-listening ielts-speaking ielts-vocab"

for %%S in (%SKILLS%) do (
  if not exist "%SRC%%%S\SKILL.md" (
    echo [FAIL] missing %%S\SKILL.md
    set "FAIL=1"
  ) else (
    if not exist "%DST%\%%S" mkdir "%DST%\%%S"
    copy /Y "%SRC%%%S\SKILL.md" "%DST%\%%S\SKILL.md" >nul
    if errorlevel 1 (
      echo [FAIL] %%S
      set "FAIL=1"
    ) else (
      echo [OK] %%S
    )
  )
)

if not exist "%SRC%ielts-dashboard\SKILL.md" (
  echo [FAIL] missing ielts-dashboard\SKILL.md
  set "FAIL=1"
) else (
  if not exist "%DST%\ielts-dashboard" mkdir "%DST%\ielts-dashboard"
  copy /Y "%SRC%ielts-dashboard\SKILL.md" "%DST%\ielts-dashboard\SKILL.md" >nul
  if errorlevel 1 (
    echo [FAIL] ielts-dashboard SKILL.md
    set "FAIL=1"
  )
)

if not exist "%SRC%ielts-dashboard\dashboard\package.json" (
  echo [FAIL] missing ielts-dashboard\dashboard
  set "FAIL=1"
) else (
  rem Clean source-controlled dashboard folders before copying, so upgrades remove deleted files.
  rem Keep node_modules to avoid forcing a full dependency reinstall.
  for %%D in (src lib scripts dist .vite coverage) do (
    if exist "%DST%\ielts-dashboard\dashboard\%%D" rmdir /S /Q "%DST%\ielts-dashboard\dashboard\%%D"
  )
  robocopy "%SRC%ielts-dashboard\dashboard" "%DST%\ielts-dashboard\dashboard" /E /XD .git node_modules dist .vite coverage docs backups backup old tmp temp /XF *.log *.tmp *.bak *.zip .DS_Store /NFL /NDL /NJH /NJS /NP >nul
  if errorlevel 8 (
    echo [FAIL] ielts-dashboard dashboard copy failed
    set "FAIL=1"
  ) else (
    echo [OK] ielts-dashboard
  )
)

if not exist "%SRC%SCHEMA.md" (
  echo [FAIL] missing SCHEMA.md
  set "FAIL=1"
) else (
  copy /Y "%SRC%SCHEMA.md" "%DST%\SCHEMA.md" >nul
  if errorlevel 1 (
    echo [FAIL] SCHEMA.md
    set "FAIL=1"
  ) else (
    echo [OK] SCHEMA.md
  )
)

if exist "%SRC%README.md" (
  copy /Y "%SRC%README.md" "%DST%\README.md" >nul
  if errorlevel 1 (
    echo [FAIL] README.md
    set "FAIL=1"
  ) else (
    echo [OK] README.md
  )
)

echo.
if "%FAIL%"=="1" (
  echo === Install finished with errors ===
  echo Check the messages above.
  pause
  exit /b 1
)

echo === Install complete ===
echo.
echo Next steps:
echo   1. Check Node.js: node --version
echo   2. Start dashboard:
echo      cd "%%USERPROFILE%%\.codex\skills\ielts-dashboard\dashboard"
echo      npm install
echo      npm start
echo   3. In Codex, try:
echo      /ielts
echo      /ielts-dashboard
echo.
echo Codex does not need statusline configuration by default.
echo.
pause
exit /b 0
