@echo off
echo Iniciando backup dos dados...

set BACKUP_DIR=backups\%date:~-4,4%-%date:~-10,2%-%date:~-7,2%
mkdir %BACKUP_DIR% 2>nul

echo Fazendo backup dos logs...
xcopy /s /y logs\* %BACKUP_DIR%\logs\ 2>nul

echo Fazendo backup das configurações...
copy appsettings.json %BACKUP_DIR%\ 2>nul
copy docker-compose.yml %BACKUP_DIR%\ 2>nul

echo Backup concluído em %BACKUP_DIR%
pause