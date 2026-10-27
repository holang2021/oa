@echo off
setlocal EnableDelayedExpansion
set "REPO=%~dp0"
set "RESULT=%~dp0push_result.txt"
set "ENVFILE=%~dp0.env"
set "CRED=%~dp0_push_cred.tmp"

echo [1/4] 准备推送 system-build 到 GitHub... > "%RESULT%"
cd /d "%REPO%"

REM —— 从 .env 读取 GITHUB_TOKEN（禁止回显、禁止进入命令行参数）——
set "TOKEN="
if exist "%ENVFILE%" (
  for /f "usebackq tokens=1,* delims==" %%A in ("%ENVFILE%") do (
    if "%%A"=="GITHUB_TOKEN" set "TOKEN=%%B"
  )
)
if not defined TOKEN (
  echo [ERROR] .env 中未配置 GITHUB_TOKEN。请复制 .env.example 为 .env，填入你的 PAT（ghp_ 开头），保存后重试。 >> "%RESULT%"
  type "%RESULT%"
  pause
  exit /b 1
)

REM —— 用临时凭据文件推送，令牌不进入 git 进程参数、不打印到控制台 ——
> "%CRED%" echo https://x-access-token:%TOKEN%@github.com
echo [2/4] 推送中（令牌仅通过凭据文件注入，绝不写入日志/参数）... >> "%RESULT%"
git -c credential.helper="store --file=%CRED%" push origin system-build >> "%RESULT%" 2>&1
set "PUSHERR=%errorlevel%"
if exist "%CRED%" del "%CRED%"

if not %PUSHERR%==0 (
  echo [ERROR] git push 失败（code %PUSHERR%）。详见 %RESULT% >> "%RESULT%"
  type "%RESULT%"
  pause
  exit /b 1
)

for /f %%H in ('git rev-parse HEAD') do set "HASH=%%H"
echo [3/4] 已推送本地 HEAD %HASH%，校验远端... >> "%RESULT%"
git ls-remote --heads origin > "%REPO%_push_check.tmp" 2>&1
findstr /C:"%HASH%" "%REPO%_push_check.tmp" >nul
if not errorlevel 1 (
  echo [4/4] 成功：%HASH% 已位于 GitHub refs/heads/system-build。 >> "%RESULT%"
) else (
  echo [4/4] 推送已发出但远端 HEAD 暂未更新（网络延迟？），请重跑确认。 >> "%RESULT%"
)
type "%RESULT%"
if exist "%REPO%_push_check.tmp" del "%REPO%_push_check.tmp"
pause
