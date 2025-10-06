@echo off
echo Iniciando backup incremental...

set BACKUP_DIR=backups\incremental\%date:~-4,4%-%date:~-10,2%-%date:~-7,2%_%time:~0,2%-%time:~3,2%
mkdir %BACKUP_DIR% 2>nul

echo Backup de arquivos modificados nas últimas 24 horas...
forfiles /p . /m *.* /d -1 /c "cmd /c copy @path %BACKUP_DIR%\" 2>nul

echo Backup de configurações...
copy *.json %BACKUP_DIR%\ 2>nul
copy *.yml %BACKUP_DIR%\ 2>nul

echo Backup incremental concluído em %BACKUP_DIR%
pause