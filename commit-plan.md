# 📋 Plano de 8 Commits

## Sequência para deixar verde:

### 1️⃣ Estrutura inicial
```bash
git add README.md .gitignore
git commit -m "feat: initial project structure and documentation"
```

### 2️⃣ C# - Projeto base
```bash
git add products-api-csharp/*.csproj
git commit -m "feat: add C# project configuration and dependencies"
```

### 3️⃣ C# - API de Produtos
```bash
git add products-api-csharp/Program.cs
git commit -m "feat: implement products API with CRUD operations"
```

### 4️⃣ Golang - Configuração
```bash
git add payments-service-golang/go.mod
git commit -m "feat: add Golang project setup and dependencies"
```

### 5️⃣ Golang - Serviço de Pagamentos
```bash
git add payments-service-golang/main.go
git commit -m "feat: implement payments service with WebSocket notifications"
```

### 6️⃣ Angular - Configuração
```bash
git add ecommerce-frontend-angular/package.json ecommerce-frontend-angular/src/index.html ecommerce-frontend-angular/src/main.ts
git commit -m "feat: add Angular project setup and configuration"
```

### 7️⃣ Angular - Frontend completo
```bash
git add ecommerce-frontend-angular/src/app/
git commit -m "feat: implement shopping cart and real-time notifications UI"
```

### 8️⃣ Scripts de automação
```bash
git add *.bat
git commit -m "feat: add automation scripts for startup and data seeding"
```

### 🚀 Push final
```bash
git push -u origin main
```