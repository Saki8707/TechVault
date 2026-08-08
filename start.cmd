@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
:loop
call "C:\Program Files\nodejs\npm.cmd" start
echo Server se ugasio, ponovno pokretanje za 5 sekundi...
ping -n 6 127.0.0.1 >nul
goto loop
