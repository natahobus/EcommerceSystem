@echo off
echo Populando dados de exemplo...

timeout /t 5 /nobreak > nul

curl -X POST http://localhost:5000/api/products -H "Content-Type: application/json" -d "{\"name\":\"Smartphone Galaxy\",\"price\":1299.99,\"stock\":50,\"category\":\"Eletrônicos\"}"

curl -X POST http://localhost:5000/api/products -H "Content-Type: application/json" -d "{\"name\":\"Notebook Dell\",\"price\":2499.99,\"stock\":25,\"category\":\"Informática\"}"

curl -X POST http://localhost:5000/api/products -H "Content-Type: application/json" -d "{\"name\":\"Fone Bluetooth\",\"price\":199.99,\"stock\":100,\"category\":\"Acessórios\"}"

curl -X POST http://localhost:5000/api/products -H "Content-Type: application/json" -d "{\"name\":\"Tablet iPad\",\"price\":1899.99,\"stock\":30,\"category\":\"Eletrônicos\"}"

curl -X POST http://localhost:5000/api/products -H "Content-Type: application/json" -d "{\"name\":\"Mouse Gamer\",\"price\":89.99,\"stock\":75,\"category\":\"Acessórios\"}"

echo.
echo ✅ Produtos adicionados com sucesso!
pause