@echo off
ping -n 9 127.0.0.1 >nul
:loop
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000 >> "D:\Cloude_project\tunnel.log" 2>&1
echo Tunel se ugasio, ponovno pokretanje za 5 sekundi... >> "D:\Cloude_project\tunnel.log"
ping -n 6 127.0.0.1 >nul
goto loop
