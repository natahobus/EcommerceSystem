@echo off
echo Iniciando deploy automatizado do E-commerce System...

echo [1/6] Verificando dependencias...
where dotnet >nul 2>nul
if %errorlevel% neq 0 (
    echo ERRO: .NET SDK nao encontrado
    pause
    exit /b 1
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado
    pause
    exit /b 1
)

echo [2/6] Compilando API C#...
cd products-api-csharp
dotnet build --configuration Release
if %errorlevel% neq 0 (
    echo ERRO: Falha na compilacao da API
    pause
    exit /b 1
)
cd ..

echo [3/6] Compilando servico Golang...
cd payments-service-golang
go build -o payments-service.exe main.go
if %errorlevel% neq 0 (
    echo ERRO: Falha na compilacao do servico Golang
    pause
    exit /b 1
)
cd ..

echo [4/6] Compilando Frontend Angular...
cd ecommerce-frontend-angular
call npm install
call npm run build --prod
if %errorlevel% neq 0 (
    echo ERRO: Falha na compilacao do frontend
    pause
    exit /b 1
)
cd ..

echo [5/6] Criando pacote de deploy...
set DEPLOY_DIR=deploy\%date:~-4,4%-%date:~-10,2%-%date:~-7,2%_%time:~0,2%-%time:~3,2%
mkdir %DEPLOY_DIR% 2>nul

xcopy /s /y products-api-csharp\bin\Release\* %DEPLOY_DIR%\api\ 2>nul
copy payments-service-golang\payments-service.exe %DEPLOY_DIR%\payments\ 2>nul
xcopy /s /y ecommerce-frontend-angular\dist\* %DEPLOY_DIR%\frontend\ 2>nul
copy docker-compose.yml %DEPLOY_DIR%\ 2>nul
copy *.json %DEPLOY_DIR%\ 2>nul

echo [6/6] Deploy concluido!
echo Arquivos disponiveis em: %DEPLOY_DIR%
echo Para executar: docker-compose up -d
pause