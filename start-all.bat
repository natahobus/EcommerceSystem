@echo off
echo Iniciando E-commerce System...

echo.
echo [1/3] Iniciando API de Produtos (C#)...
start "Products API" cmd /k "cd products-api-csharp && dotnet run"

timeout /t 3 /nobreak > nul

echo [2/3] Iniciando Serviço de Pagamentos (Golang)...
start "Payments Service" cmd /k "cd payments-service-golang && go run main.go"

timeout /t 3 /nobreak > nul

echo [3/3] Iniciando Frontend (Angular)...
start "Frontend" cmd /k "cd ecommerce-frontend-angular && npm start"

echo.
echo ✅ Todos os serviços foram iniciados!
echo.
echo 📍 URLs:
echo   - API Produtos: http://localhost:5000
echo   - Pagamentos: http://localhost:8081  
echo   - Frontend: http://localhost:4200
echo.
pause