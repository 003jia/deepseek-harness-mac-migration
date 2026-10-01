@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\@deepseek-ai" (
  echo DeepSeek Harness dependencies are missing. Run pnpm install in this directory.
  pause
  exit /b 1
)
if not exist "apps\web\dist\index.html" (
  echo DeepSeek Harness Web assets are missing. Run pnpm run build in this directory.
  pause
  exit /b 1
)
if not exist "apps\cli\lib\bin.js" (
  echo DeepSeek Harness CLI is missing. Run pnpm run build in this directory.
  pause
  exit /b 1
)
echo Starting DeepSeek Harness Web. Keep this window open while using the app.
node apps\cli\lib\bin.js web
set "launchExitCode=%errorlevel%"
if not "%launchExitCode%"=="0" pause
exit /b %launchExitCode%
