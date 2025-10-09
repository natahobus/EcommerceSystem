@echo off
echo Iniciando backup em nuvem...

set BACKUP_NAME=ecommerce-backup-%date:~-4,4%-%date:~-10,2%-%date:~-7,2%
set BACKUP_DIR=cloud-backup\%BACKUP_NAME%

mkdir %BACKUP_DIR% 2>nul

echo Compactando arquivos do projeto...
powershell Compress-Archive -Path "*.json","*.yml","*.md","products-api-csharp\*","ecommerce-frontend-angular\src\*" -DestinationPath "%BACKUP_DIR%\project-files.zip" -Force

echo Criando manifesto do backup...
echo Backup criado em: %date% %time% > %BACKUP_DIR%\manifest.txt
echo Arquivos incluidos: >> %BACKUP_DIR%\manifest.txt
echo - Configuracoes JSON/YAML >> %BACKUP_DIR%\manifest.txt
echo - Codigo fonte da API >> %BACKUP_DIR%\manifest.txt
echo - Codigo fonte do Frontend >> %BACKUP_DIR%\manifest.txt

echo Backup em nuvem preparado em %BACKUP_DIR%
echo Para upload: sincronize a pasta com seu servico de nuvem
pause