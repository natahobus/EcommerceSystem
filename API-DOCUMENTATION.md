# 📚 Documentação da API - E-commerce System

## 🔗 Endpoints Principais

### 🛍️ Produtos

#### `GET /api/products`
Lista produtos com paginação e filtros
- **Parâmetros**: `page`, `size`, `category`, `search`, `sortBy`, `sortOrder`
- **Resposta**: Lista paginada de produtos

#### `GET /api/products/{id}`
Busca produto por ID
- **Resposta**: Dados do produto ou 404

#### `POST /api/products`
Cria novo produto
- **Body**: Objeto Product
- **Resposta**: Produto criado com ID

#### `PUT /api/products/{id}`
Atualiza produto existente
- **Body**: Dados do produto
- **Resposta**: 204 No Content

#### `DELETE /api/products/{id}`
Remove produto
- **Resposta**: Produto removido ou 404

### 🛒 Pedidos

#### `POST /api/orders`
Cria novo pedido
- **Body**: Objeto Order com items
- **Resposta**: Pedido criado

#### `GET /api/orders`
Lista todos os pedidos
- **Resposta**: Array de pedidos

### 📊 Estatísticas e Métricas

#### `GET /api/stats`
Estatísticas básicas do sistema
- **Resposta**: Contadores gerais

#### `GET /api/metrics`
Métricas detalhadas
- **Resposta**: Top categorias e pedidos recentes

#### `GET /api/metrics/realtime`
Métricas em tempo real
- **Resposta**: Dados atualizados do dia

#### `GET /api/metrics/conversion`
Métricas de conversão
- **Resposta**: Taxa de conversão e produtos mais vendidos

### 🔍 Busca e Filtros

#### `GET /api/products/search`
Busca avançada de produtos
- **Parâmetros**: `query`, `minPrice`, `maxPrice`, `category`

#### `GET /api/products/filter`
Filtros avançados
- **Parâmetros**: `inStock`, `onSale`, `featured`, `rating`

#### `GET /api/products/barcode/{code}`
Busca por código de barras
- **Resposta**: Produto encontrado ou 404

### 🏷️ Categorias e Tags

#### `GET /api/categories`
Lista todas as categorias
- **Resposta**: Array de categorias únicas

#### `GET /api/products/featured`
Produtos em destaque
- **Resposta**: Top 10 produtos destacados

#### `GET /api/products/on-sale`
Produtos em promoção
- **Resposta**: Produtos com desconto

### 💰 Cupons e Descontos

#### `GET /api/coupons/{code}`
Valida cupom de desconto
- **Resposta**: Dados do cupom ou 404

### 🔄 Recomendações

#### `GET /api/products/{id}/recommendations`
Produtos recomendados
- **Resposta**: Produtos similares por categoria

#### `GET /api/products/{id}/related`
Produtos relacionados
- **Resposta**: Produtos relacionados por tags

#### `GET /api/products/bestsellers`
Produtos mais vendidos
- **Resposta**: Top 10 bestsellers

### 📈 Relatórios

#### `GET /api/reports/sales`
Relatório de vendas
- **Parâmetros**: `startDate`, `endDate`
- **Resposta**: Dados de vendas por período

#### `GET /api/reports/advanced`
Relatórios avançados
- **Parâmetros**: `type` (sales, inventory, customers, performance), `days`
- **Resposta**: Relatório específico

### 🏥 Monitoramento

#### `GET /health`
Status de saúde da API
- **Resposta**: Status e timestamp

#### `GET /api/monitoring`
Métricas de monitoramento
- **Resposta**: Uptime, memória, requisições

### 📋 Inventário

#### `GET /api/products/{id}/stock`
Verifica estoque de produto
- **Resposta**: Disponibilidade atual

#### `GET /api/inventory/low-stock`
Produtos com estoque baixo
- **Parâmetros**: `threshold` (padrão: 5)

#### `GET /api/alerts/stock`
Alertas de estoque crítico
- **Resposta**: Produtos críticos e baixos

### 📊 Exportação

#### `GET /api/export/products`
Exporta produtos em CSV
- **Resposta**: Arquivo CSV

### 🌍 Geolocalização

#### `GET /api/products/nearby`
Busca por proximidade
- **Parâmetros**: `lat`, `lng`, `radius`
- **Resposta**: Produtos próximos (simulado)

### 📝 Logs e Auditoria

#### `GET /api/logs`
Logs do sistema
- **Resposta**: Últimos 100 logs de auditoria

## 🔒 Códigos de Status

- `200` - Sucesso
- `201` - Criado
- `204` - Sem conteúdo
- `400` - Requisição inválida
- `404` - Não encontrado
- `429` - Muitas requisições
- `500` - Erro interno

## 🚀 Exemplos de Uso

```bash
# Listar produtos
curl "http://localhost:5000/api/products?page=1&size=10"

# Buscar produto
curl "http://localhost:5000/api/products/1"

# Criar produto
curl -X POST "http://localhost:5000/api/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"Produto Teste","price":99.99,"stock":10,"category":"Eletrônicos"}'

# Estatísticas
curl "http://localhost:5000/api/stats"
```

## 📞 Suporte

Para dúvidas sobre a API, consulte os logs ou entre em contato com a equipe de desenvolvimento.