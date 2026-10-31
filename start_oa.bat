@echo off
title HOLANG OA Service (backend + frontend)
cd /d "C:\Users\liush\holang-oa\holang-oa\backend"
set DATABASE_URL=file:./holang-crm-preview.db
set PORT=3001
set NODE_ENV=production
echo HOLANG OA starting on port 3001 (backend API + frontend)...
:loop
npx tsx src/index.ts
echo Service stopped unexpectedly. Restarting in 3 seconds...
timeout /t 3 /nobreak >nul
goto loop
