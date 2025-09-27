# 🛒 E-commerce System

Sistema de e-commerce completo com microserviços usando C#, Golang e Angular.

## 🏗️ Arquitetura

- **Backend C# (.NET)**: API REST para produtos e pedidos
- **Backend Golang**: Serviço de pagamentos com WebSocket para notificações em tempo real
- **Frontend Angular**: Interface da loja virtual

## 🚀 Como Executar

### Pré-requisitos
- .NET 8.0
- Go 1.21+
- Node.js 18+
- Angular CLI

### Instalação

1. **API de Produtos (C#)**:
```bash
cd products-api-csharp
dotnet restore
dotnet run
```

2. **Serviço de Pagamentos (Golang)**:
```bash
cd payments-service-golang
go mod tidy
go run main.go
```

3. **Frontend (Angular)**:
```bash
cd ecommerce-frontend-angular
npm install
npm start
```

### Execução Automática
Execute o arquivo `start-all.bat` para iniciar todos os serviços automaticamente.

## 📋 Funcionalidades

### ✅ Implementadas
- Catálogo de produtos
- Carrinho de compras
- Processamento de pedidos
- Sistema de pagamentos
- Notificações em tempo real
- Controle de estoque

### 🔄 APIs Disponíveis

**API de Produtos (C#) - Port 5000**
- `GET /api/products` - Listar produtos
- `POST /api/products` - Criar produto
- `PUT /api/products/{id}` - Atualizar produto
- `DELETE /api/products/{id}` - Deletar produto
- `POST /api/orders` - Criar pedido
- `GET /api/orders` - Listar pedidos

**Serviço de Pagamentos (Golang) - Port 8081**
- `POST /api/payments` - Processar pagamento
- `WS /ws` - WebSocket para notificações

## 🎯 Próximos Passos

- Autenticação de usuários
- Dashboard administrativo
- Relatórios de vendas
- Integração com gateway de pagamento real
- Deploy com Docker

## 🛠️ Tecnologias

- **C#**: .NET 8, Entity Framework, Swagger
- **Golang**: Gorilla Mux, WebSocket
- **Angular**: Standalone Components, RxJS, HttpClient