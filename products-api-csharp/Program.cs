using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.ComponentModel.DataAnnotations;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<ProductContext>(opt => opt.UseInMemoryDatabase("Products"));
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<ThrottleService>();
builder.Services.AddSingleton<WebhookService>();
builder.Services.AddHttpClient();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddResponseCompression();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecific", policy =>
    {
        policy.WithOrigins("http://localhost:4200", "https://ecommerce.com")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseResponseCompression();
app.Use(async (context, next) =>
{
    context.Response.Headers.Add("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Add("X-Frame-Options", "DENY");
    context.Response.Headers.Add("X-XSS-Protection", "1; mode=block");
    await next();
});
app.UseCors("AllowSpecific");

// API Versioning
app.MapGet("/api/version", () => new { version = "2.0", apiName = "E-commerce API", supportedVersions = new[] { "v1", "v2" } });

// Produtos V1 (Legacy)
app.MapGet("/api/v1/products", async (ProductContext db) => await db.Products.ToListAsync());

// Produtos V2 (Current)
app.MapGet("/api/products", async (ProductContext db, IMemoryCache cache, int page = 1, int size = 10, string? category = null, string? search = null, string? sortBy = "name", string? sortOrder = "asc") =>
{
    var cacheKey = $"products_list_{page}_{size}_{category}_{search}_{sortBy}_{sortOrder}";
    if (cache.TryGetValue(cacheKey, out object? cachedResult))
        return cachedResult;
    
    var query = db.Products.AsQueryable();
    if (!string.IsNullOrEmpty(category))
        query = query.Where(p => p.Category == category);
    if (!string.IsNullOrEmpty(search))
        query = query.Where(p => p.Name.Contains(search));
    
    // Apply sorting
    query = sortBy?.ToLower() switch
    {
        "price" => sortOrder == "desc" ? query.OrderByDescending(p => p.Price) : query.OrderBy(p => p.Price),
        "stock" => sortOrder == "desc" ? query.OrderByDescending(p => p.Stock) : query.OrderBy(p => p.Stock),
        _ => sortOrder == "desc" ? query.OrderByDescending(p => p.Name) : query.OrderBy(p => p.Name)
    };
    
    var totalItems = await query.CountAsync();
    var products = await query
        .Skip((page - 1) * size)
        .Take(size)
        .ToListAsync();
    
    var result = new { products, totalItems, page, size, category, search, sortBy, sortOrder };
    cache.Set(cacheKey, result, TimeSpan.FromMinutes(5));
    return result;
});

app.MapGet("/api/products/{id}", async (int id, ProductContext db) =>
    await db.Products.FindAsync(id) is Product product ? Results.Ok(product) : Results.NotFound());

app.MapPost("/api/products", async (Product product, ProductContext db, ILogger<Program> logger, IMemoryCache cache, WebhookService webhook) =>
{
    logger.LogInformation("Tentativa de criar produto: {ProductName}", product.Name);
    
    if (string.IsNullOrWhiteSpace(product.Name) || product.Price <= 0 || product.Stock < 0)
    {
        logger.LogWarning("Dados inválidos para produto: {ProductName}", product.Name);
        return Results.BadRequest("Dados inválidos");
    }
    
    db.Products.Add(product);
    await db.SaveChangesAsync();
    
    // Invalidate cache
    var keysToRemove = new List<string>();
    foreach (var key in cache.GetType().GetField("_coherentState", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?.GetValue(cache) as IDictionary ?? new Dictionary<object, object>())
    {
        if (key.Key.ToString()?.StartsWith("products_list_") == true)
            cache.Remove(key.Key);
    }
    
    // Notify webhooks
    await webhook.NotifyAsync("product.created", new { productId = product.Id, name = product.Name });
    
    logger.LogInformation("Produto criado com sucesso: {ProductId}", product.Id);
    return Results.Created($"/api/products/{product.Id}", product);
});

app.MapPut("/api/products/{id}", async (int id, Product inputProduct, ProductContext db, ILogger<Program> logger) =>
{
    var product = await db.Products.FindAsync(id);
    if (product is null) return Results.NotFound();
    
    if (string.IsNullOrWhiteSpace(inputProduct.Name) || inputProduct.Price <= 0 || inputProduct.Stock < 0)
    {
        logger.LogWarning("Dados inválidos na atualização do produto {ProductId}", id);
        return Results.BadRequest("Dados inválidos");
    }
    
    product.Name = inputProduct.Name;
    product.Price = inputProduct.Price;
    product.Stock = inputProduct.Stock;
    product.Category = inputProduct.Category;
    
    await db.SaveChangesAsync();
    logger.LogInformation("Produto {ProductId} atualizado com sucesso", id);
    return Results.NoContent();
});

app.MapDelete("/api/products/{id}", async (int id, ProductContext db) =>
{
    if (await db.Products.FindAsync(id) is Product product)
    {
        db.Products.Remove(product);
        await db.SaveChangesAsync();
        return Results.Ok(product);
    }
    return Results.NotFound();
});

// Health Check
app.MapGet("/health", () => new { status = "healthy", timestamp = DateTime.UtcNow });

// Health Check Detalhado
app.MapGet("/api/health/detailed", async (ProductContext db) =>
{
    var dbStatus = "healthy";
    var dbResponseTime = 0.0;
    
    try
    {
        var start = DateTime.UtcNow;
        await db.Products.CountAsync();
        dbResponseTime = (DateTime.UtcNow - start).TotalMilliseconds;
    }
    catch
    {
        dbStatus = "unhealthy";
    }
    
    return new {
        status = dbStatus == "healthy" ? "healthy" : "degraded",
        timestamp = DateTime.UtcNow,
        services = new {
            database = new { status = dbStatus, responseTime = dbResponseTime },
            memory = new { usage = GC.GetTotalMemory(false) / 1024 / 1024, status = "healthy" },
            uptime = Environment.TickCount64
        }
    };
});

// Health Check Liveness
app.MapGet("/api/health/live", () => new { alive = true, timestamp = DateTime.UtcNow });

// Health Check Readiness
app.MapGet("/api/health/ready", async (ProductContext db) =>
{
    try
    {
        await db.Products.CountAsync();
        return new { ready = true, timestamp = DateTime.UtcNow };
    }
    catch
    {
        return Results.Problem("Service not ready");
    }
});

// Estatísticas V1
app.MapGet("/api/v1/stats", async (ProductContext db) =>
{
    var totalProducts = await db.Products.CountAsync();
    var totalOrders = await db.Orders.CountAsync();
    return new { totalProducts, totalOrders };
});

// Estatísticas V2 (Enhanced)
app.MapGet("/api/stats", async (ProductContext db) =>
{
    var totalProducts = await db.Products.CountAsync();
    var totalOrders = await db.Orders.CountAsync();
    var totalRevenue = await db.Orders.SumAsync(o => o.Total);
    var lowStockProducts = await db.Products.CountAsync(p => p.Stock < 10);
    
    return new { totalProducts, totalOrders, totalRevenue, lowStockProducts };
});

// Métricas
app.MapGet("/api/metrics", async (ProductContext db) =>
{
    var topCategories = await db.Products
        .GroupBy(p => p.Category)
        .Select(g => new { category = g.Key, count = g.Count() })
        .OrderByDescending(x => x.count)
        .Take(5)
        .ToListAsync();
    
    var recentOrders = await db.Orders
        .Where(o => o.CreatedAt >= DateTime.Now.AddDays(-7))
        .CountAsync();
    
    return new { topCategories, recentOrders };
});

// Busca avançada com filtros
app.MapPost("/api/products/search/advanced", async (AdvancedSearchRequest request, ProductContext db) =>
{
    var query = db.Products.AsQueryable();
    
    // Text search
    if (!string.IsNullOrEmpty(request.Query))
    {
        query = query.Where(p => p.Name.Contains(request.Query) || 
                                p.Category.Contains(request.Query) || 
                                p.Tags.Contains(request.Query));
    }
    
    // Price range
    if (request.MinPrice.HasValue)
        query = query.Where(p => p.Price >= request.MinPrice.Value);
    if (request.MaxPrice.HasValue)
        query = query.Where(p => p.Price <= request.MaxPrice.Value);
    
    // Categories
    if (request.Categories?.Any() == true)
        query = query.Where(p => request.Categories.Contains(p.Category));
    
    // Stock filter
    if (request.InStockOnly)
        query = query.Where(p => p.Stock > 0);
    
    // Featured filter
    if (request.FeaturedOnly)
        query = query.Where(p => p.IsFeatured);
    
    // On sale filter
    if (request.OnSaleOnly)
        query = query.Where(p => p.DiscountPercentage > 0);
    
    // Sorting
    query = request.SortBy?.ToLower() switch
    {
        "price_asc" => query.OrderBy(p => p.Price),
        "price_desc" => query.OrderByDescending(p => p.Price),
        "name_asc" => query.OrderBy(p => p.Name),
        "name_desc" => query.OrderByDescending(p => p.Name),
        "newest" => query.OrderByDescending(p => p.Id),
        "popularity" => query.OrderByDescending(p => p.Stock), // Simulated
        _ => query.OrderBy(p => p.Name)
    };
    
    var totalCount = await query.CountAsync();
    var products = await query
        .Skip((request.Page - 1) * request.PageSize)
        .Take(request.PageSize)
        .ToListAsync();
    
    // Generate facets
    var facets = await GenerateSearchFacets(db, request);
    
    return new {
        products,
        totalCount,
        page = request.Page,
        pageSize = request.PageSize,
        totalPages = (int)Math.Ceiling((double)totalCount / request.PageSize),
        facets,
        appliedFilters = request
    };
});

// Search suggestions
app.MapGet("/api/products/search/suggestions", async (ProductContext db, string? q) =>
{
    if (string.IsNullOrEmpty(q) || q.Length < 2) return new string[0];
    
    var suggestions = await db.Products
        .Where(p => p.Name.Contains(q))
        .Select(p => p.Name)
        .Distinct()
        .Take(10)
        .ToListAsync();
    
    return suggestions;
});

// Busca avançada (legacy)
app.MapGet("/api/products/search", async (ProductContext db, string? query, decimal? minPrice, decimal? maxPrice, string? category) =>
{
    var products = db.Products.AsQueryable();
    
    if (!string.IsNullOrEmpty(query))
        products = products.Where(p => p.Name.Contains(query) || p.Category.Contains(query) || p.Tags.Contains(query));
    
    if (minPrice.HasValue)
        products = products.Where(p => p.Price >= minPrice.Value);
    
    if (maxPrice.HasValue)
        products = products.Where(p => p.Price <= maxPrice.Value);
    
    if (!string.IsNullOrEmpty(category))
        products = products.Where(p => p.Category == category);
    
    return await products.Take(50).ToListAsync();
});

// Pedidos V1
app.MapPost("/api/v1/orders", async (Order order, ProductContext db) =>
{
    db.Orders.Add(order);
    await db.SaveChangesAsync();
    return Results.Created($"/api/v1/orders/{order.Id}", order);
});

// Pedidos V2 (Enhanced)
app.MapPost("/api/orders", async (Order order, ProductContext db, WebhookService webhook) =>
{
    foreach (var item in order.Items)
    {
        var product = await db.Products.FindAsync(item.ProductId);
        if (product == null || product.Stock < item.Quantity)
            return Results.BadRequest("Produto indisponível");
        
        product.Stock -= item.Quantity;
    }
    
    db.Orders.Add(order);
    await db.SaveChangesAsync();
    
    // Notify webhooks
    await webhook.NotifyAsync("order.created", new { orderId = order.Id, total = order.Total });
    
    return Results.Created($"/api/orders/{order.Id}", order);
});

app.MapGet("/api/orders", async (ProductContext db) =>
    await db.Orders.Include(o => o.Items).ToListAsync());

// Relatórios
app.MapGet("/api/reports/sales", async (ProductContext db, DateTime? startDate, DateTime? endDate) =>
{
    var start = startDate ?? DateTime.Now.AddDays(-30);
    var end = endDate ?? DateTime.Now;
    
    var salesData = await db.Orders
        .Where(o => o.CreatedAt >= start && o.CreatedAt <= end)
        .GroupBy(o => o.CreatedAt.Date)
        .Select(g => new { date = g.Key, total = g.Sum(o => o.Total), count = g.Count() })
        .OrderBy(x => x.date)
        .ToListAsync();
    
    return new { period = new { start, end }, sales = salesData };
});

// Produtos em destaque
app.MapGet("/api/products/featured", async (ProductContext db) =>
    await db.Products.Where(p => p.IsFeatured).Take(10).ToListAsync());

// Verificar estoque
app.MapGet("/api/products/{id}/stock", async (int id, ProductContext db) =>
{
    var product = await db.Products.FindAsync(id);
    if (product == null) return Results.NotFound();
    
    return new { productId = id, stock = product.Stock, available = product.Stock > 0 };
});

// Categorias
app.MapGet("/api/categories", async (ProductContext db) =>
    await db.Products.Select(p => p.Category).Distinct().ToListAsync());

// Produtos em promoção
app.MapGet("/api/products/on-sale", async (ProductContext db) =>
    await db.Products.Where(p => p.DiscountPercentage > 0).Take(20).ToListAsync());

// Avaliações
app.MapGet("/api/products/{id}/reviews", async (int id, ProductContext db) =>
    await db.Reviews.Where(r => r.ProductId == id).ToListAsync());

// Cupons
app.MapGet("/api/coupons/{code}", async (string code, ProductContext db) =>
{
    var coupon = await db.Coupons.FirstOrDefaultAsync(c => c.Code == code && c.IsActive && c.ExpiresAt > DateTime.Now);
    return coupon != null ? Results.Ok(coupon) : Results.NotFound();
});

// Produtos mais vendidos
app.MapGet("/api/products/bestsellers", async (ProductContext db) =>
{
    var bestsellers = await db.OrderItems
        .GroupBy(oi => oi.ProductId)
        .Select(g => new { productId = g.Key, totalSold = g.Sum(oi => oi.Quantity) })
        .OrderByDescending(x => x.totalSold)
        .Take(10)
        .ToListAsync();
    
    return bestsellers;
});

// Recomendações
app.MapGet("/api/products/{id}/recommendations", async (int id, ProductContext db) =>
{
    var product = await db.Products.FindAsync(id);
    if (product == null) return Results.NotFound();
    
    var recommendations = await db.Products
        .Where(p => p.Category == product.Category && p.Id != id)
        .Take(5)
        .ToListAsync();
    
    return recommendations;
});

// Inventário
app.MapGet("/api/inventory/low-stock", async (ProductContext db, int threshold = 5) =>
    await db.Products.Where(p => p.Stock <= threshold).ToListAsync());

// Filtros avançados
app.MapGet("/api/products/filter", async (ProductContext db, bool? inStock, bool? onSale, bool? featured, decimal? rating) =>
{
    var query = db.Products.AsQueryable();
    
    if (inStock == true)
        query = query.Where(p => p.Stock > 0);
    
    if (onSale == true)
        query = query.Where(p => p.DiscountPercentage > 0);
    
    if (featured == true)
        query = query.Where(p => p.IsFeatured);
    
    return await query.Take(100).ToListAsync();
});

// Estatísticas detalhadas
app.MapGet("/api/stats/detailed", async (ProductContext db) =>
{
    var totalValue = await db.Products.SumAsync(p => p.Price * p.Stock);
    var avgPrice = await db.Products.AverageAsync(p => p.Price);
    var totalCategories = await db.Products.Select(p => p.Category).Distinct().CountAsync();
    var outOfStock = await db.Products.CountAsync(p => p.Stock == 0);
    
    return new { totalValue, avgPrice, totalCategories, outOfStock };
});

// Busca por código de barras
app.MapGet("/api/products/barcode/{code}", async (string code, ProductContext db) =>
{
    var product = await db.Products.FirstOrDefaultAsync(p => p.Barcode == code);
    return product != null ? Results.Ok(product) : Results.NotFound();
});

// Alertas de estoque
app.MapGet("/api/alerts/stock", async (ProductContext db) =>
{
    var criticalStock = await db.Products.Where(p => p.Stock <= 2).ToListAsync();
    var lowStock = await db.Products.Where(p => p.Stock > 2 && p.Stock <= 10).ToListAsync();
    
    return new { critical = criticalStock, low = lowStock };
});

// Exportação de dados
app.MapGet("/api/export/products", async (ProductContext db) =>
{
    var products = await db.Products.ToListAsync();
    var csv = "Id,Name,Price,Stock,Category\n";
    foreach (var p in products)
    {
        csv += $"{p.Id},{p.Name},{p.Price},{p.Stock},{p.Category}\n";
    }
    return Results.Text(csv, "text/csv");
});

// Produtos relacionados
app.MapGet("/api/products/{id}/related", async (int id, ProductContext db) =>
{
    var product = await db.Products.FindAsync(id);
    if (product == null) return Results.NotFound();
    
    var related = await db.Products
        .Where(p => p.Id != id && (p.Category == product.Category || p.Tags.Contains(product.Tags)))
        .Take(8)
        .ToListAsync();
    
    return related;
});

// Métricas em tempo real
app.MapGet("/api/metrics/realtime", async (ProductContext db) =>
{
    var now = DateTime.Now;
    var todayOrders = await db.Orders.CountAsync(o => o.CreatedAt.Date == now.Date);
    var todayRevenue = await db.Orders.Where(o => o.CreatedAt.Date == now.Date).SumAsync(o => o.Total);
    var activeProducts = await db.Products.CountAsync(p => p.Stock > 0);
    
    return new { 
        timestamp = now,
        todayOrders,
        todayRevenue,
        activeProducts,
        serverUptime = Environment.TickCount64
    };
});

// Dashboard Analytics
app.MapGet("/api/analytics/dashboard", async (ProductContext db) =>
{
    var now = DateTime.Now;
    var last7Days = now.AddDays(-7);
    var last30Days = now.AddDays(-30);
    
    var salesTrend = await db.Orders
        .Where(o => o.CreatedAt >= last7Days)
        .GroupBy(o => o.CreatedAt.Date)
        .Select(g => new { date = g.Key, sales = g.Sum(o => o.Total), orders = g.Count() })
        .OrderBy(x => x.date)
        .ToListAsync();
    
    var topProducts = await db.OrderItems
        .Where(oi => oi.Id > 0)
        .GroupBy(oi => oi.ProductId)
        .Select(g => new { productId = g.Key, quantity = g.Sum(oi => oi.Quantity), revenue = g.Sum(oi => oi.Price * oi.Quantity) })
        .OrderByDescending(x => x.revenue)
        .Take(5)
        .ToListAsync();
    
    var categoryPerformance = await db.Products
        .GroupBy(p => p.Category)
        .Select(g => new { category = g.Key, products = g.Count(), totalValue = g.Sum(p => p.Price * p.Stock) })
        .OrderByDescending(x => x.totalValue)
        .ToListAsync();
    
    return new {
        salesTrend,
        topProducts,
        categoryPerformance,
        kpis = new {
            totalRevenue = await db.Orders.SumAsync(o => o.Total),
            totalOrders = await db.Orders.CountAsync(),
            avgOrderValue = await db.Orders.AverageAsync(o => (double)o.Total),
            conversionRate = 3.2 // Simulado
        }
    };
});

// Analytics por período
app.MapGet("/api/analytics/period", async (ProductContext db, DateTime? start, DateTime? end) =>
{
    var startDate = start ?? DateTime.Now.AddDays(-30);
    var endDate = end ?? DateTime.Now;
    
    var periodData = await db.Orders
        .Where(o => o.CreatedAt >= startDate && o.CreatedAt <= endDate)
        .GroupBy(o => new { o.CreatedAt.Year, o.CreatedAt.Month, o.CreatedAt.Day })
        .Select(g => new {
            date = new DateTime(g.Key.Year, g.Key.Month, g.Key.Day),
            orders = g.Count(),
            revenue = g.Sum(o => o.Total),
            avgOrder = g.Average(o => (double)o.Total)
        })
        .OrderBy(x => x.date)
        .ToListAsync();
    
    return new { period = new { start = startDate, end = endDate }, data = periodData };
});

// Heatmap de vendas
app.MapGet("/api/analytics/heatmap", async (ProductContext db) =>
{
    var heatmapData = await db.Orders
        .Where(o => o.CreatedAt >= DateTime.Now.AddDays(-30))
        .GroupBy(o => new { Hour = o.CreatedAt.Hour, Day = (int)o.CreatedAt.DayOfWeek })
        .Select(g => new { hour = g.Key.Hour, day = g.Key.Day, orders = g.Count() })
        .ToListAsync();
    
    return heatmapData;
});

// Logs do sistema
app.MapGet("/api/logs", async (ProductContext db) =>
{
    var logs = await db.AuditLogs
        .OrderByDescending(l => l.Timestamp)
        .Take(100)
        .ToListAsync();
    
    return logs;
});

// Busca por proximidade (simulado)
app.MapGet("/api/products/nearby", async (ProductContext db, double lat = 0, double lng = 0, int radius = 10) =>
{
    // Simulação de busca por proximidade
    var products = await db.Products
        .Where(p => p.Stock > 0)
        .Take(20)
        .ToListAsync();
    
    return new { 
        location = new { latitude = lat, longitude = lng, radius },
        products = products.Select(p => new {
            p.Id, p.Name, p.Price, p.Stock,
            distance = Math.Round(new Random().NextDouble() * radius, 2)
        })
    };
});

// Monitoramento da API
app.MapGet("/api/monitoring", async (ProductContext db) =>
{
    var uptime = Environment.TickCount64;
    var memoryUsage = GC.GetTotalMemory(false);
    var requestsToday = await db.AuditLogs
        .CountAsync(l => l.Timestamp.Date == DateTime.Today);
    
    return new {
        uptime = TimeSpan.FromMilliseconds(uptime),
        memoryUsage = $"{memoryUsage / 1024 / 1024} MB",
        requestsToday,
        status = "healthy",
        timestamp = DateTime.UtcNow
    };
});

// Métricas de conversão
app.MapGet("/api/metrics/conversion", async (ProductContext db) =>
{
    var totalViews = await db.AuditLogs.CountAsync(l => l.Action == "view_product");
    var totalOrders = await db.Orders.CountAsync();
    var conversionRate = totalViews > 0 ? (double)totalOrders / totalViews * 100 : 0;
    
    var avgOrderValue = await db.Orders.AverageAsync(o => (double)o.Total);
    var topSellingProducts = await db.OrderItems
        .GroupBy(oi => oi.ProductId)
        .Select(g => new { productId = g.Key, quantity = g.Sum(oi => oi.Quantity) })
        .OrderByDescending(x => x.quantity)
        .Take(5)
        .ToListAsync();
    
    return new {
        conversionRate = Math.Round(conversionRate, 2),
        avgOrderValue = Math.Round(avgOrderValue, 2),
        totalViews,
        totalOrders,
        topSellingProducts
    };
});

// Relatórios avançados
app.MapGet("/api/reports/advanced", async (ProductContext db, string? type = "sales", int days = 30) =>
{
    var startDate = DateTime.Now.AddDays(-days);
    
    return type switch
    {
        "inventory" => await GenerateInventoryReport(db, startDate),
        "customers" => await GenerateCustomerReport(db, startDate),
        "performance" => await GeneratePerformanceReport(db, startDate),
        _ => await GenerateSalesReport(db, startDate)
    };
});

static async Task<object> GenerateInventoryReport(ProductContext db, DateTime startDate)
{
    var lowStock = await db.Products.Where(p => p.Stock <= 10).CountAsync();
    var outOfStock = await db.Products.Where(p => p.Stock == 0).CountAsync();
    var totalValue = await db.Products.SumAsync(p => p.Price * p.Stock);
    
    return new { lowStock, outOfStock, totalValue, reportType = "inventory" };
}

static async Task<object> GenerateCustomerReport(ProductContext db, DateTime startDate)
{
    var newCustomers = await db.Orders.Where(o => o.CreatedAt >= startDate).Select(o => o.Id).Distinct().CountAsync();
    var repeatCustomers = await db.Orders.GroupBy(o => o.Id).Where(g => g.Count() > 1).CountAsync();
    
    return new { newCustomers, repeatCustomers, reportType = "customers" };
}

static async Task<object> GeneratePerformanceReport(ProductContext db, DateTime startDate)
{
    var avgOrderValue = await db.Orders.Where(o => o.CreatedAt >= startDate).AverageAsync(o => (double)o.Total);
    var orderCount = await db.Orders.Where(o => o.CreatedAt >= startDate).CountAsync();
    
    return new { avgOrderValue, orderCount, reportType = "performance" };
}

static async Task<object> GenerateSearchFacets(ProductContext db, AdvancedSearchRequest request)
{
    var baseQuery = db.Products.AsQueryable();
    
    // Apply text search to base query for facets
    if (!string.IsNullOrEmpty(request.Query))
    {
        baseQuery = baseQuery.Where(p => p.Name.Contains(request.Query) || 
                                        p.Category.Contains(request.Query) || 
                                        p.Tags.Contains(request.Query));
    }
    
    var categories = await baseQuery
        .GroupBy(p => p.Category)
        .Select(g => new { name = g.Key, count = g.Count() })
        .OrderByDescending(x => x.count)
        .ToListAsync();
    
    var priceRanges = new[]
    {
        new { name = "Até R$50", min = 0m, max = 50m, count = await baseQuery.CountAsync(p => p.Price <= 50) },
        new { name = "R$50 - R$100", min = 50m, max = 100m, count = await baseQuery.CountAsync(p => p.Price > 50 && p.Price <= 100) },
        new { name = "R$100 - R$200", min = 100m, max = 200m, count = await baseQuery.CountAsync(p => p.Price > 100 && p.Price <= 200) },
        new { name = "Acima de R$200", min = 200m, max = decimal.MaxValue, count = await baseQuery.CountAsync(p => p.Price > 200) }
    };
    
    return new {
        categories,
        priceRanges = priceRanges.Where(pr => pr.count > 0),
        availability = new {
            inStock = await baseQuery.CountAsync(p => p.Stock > 0),
            outOfStock = await baseQuery.CountAsync(p => p.Stock == 0)
        },
        features = new {
            featured = await baseQuery.CountAsync(p => p.IsFeatured),
            onSale = await baseQuery.CountAsync(p => p.DiscountPercentage > 0)
        }
    };
}

static async Task<object> GenerateSalesReport(ProductContext db, DateTime startDate)
{
    var totalSales = await db.Orders.Where(o => o.CreatedAt >= startDate).SumAsync(o => o.Total);
    var orderCount = await db.Orders.Where(o => o.CreatedAt >= startDate).CountAsync();
    
    return new { totalSales, orderCount, reportType = "sales" };
}

// Rate limiting avançado
app.MapGet("/api/rate-limit/status", async (HttpContext context, ThrottleService throttle) =>
{
    var clientId = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    var isAllowed = throttle.IsAllowed(clientId);
    
    return new {
        clientId,
        allowed = isAllowed,
        timestamp = DateTime.UtcNow,
        resetTime = DateTime.UtcNow.AddSeconds(60)
    };
});piresAt > DateTime.Now);
    return coupon != null ? Results.Ok(coupon) : Results.NotFound();
});

// GraphQL-style Query
app.MapPost("/api/query", async (QueryRequest request, ProductContext db) =>
{
    var result = new Dictionary<string, object>();
    
    if (request.Fields.Contains("products"))
    {
        var products = await db.Products.Take(request.Limit ?? 10).ToListAsync();
        result["products"] = products;
    }
    
    if (request.Fields.Contains("orders"))
    {
        var orders = await db.Orders.Take(request.Limit ?? 10).ToListAsync();
        result["orders"] = orders;
    }
    
    if (request.Fields.Contains("stats"))
    {
        result["stats"] = new {
            totalProducts = await db.Products.CountAsync(),
            totalOrders = await db.Orders.CountAsync()
        };
    }
    
    return result;
});

// Webhooks
app.MapPost("/api/webhooks/register", (string url, WebhookService webhook) =>
{
    webhook.RegisterWebhook(url);
    return Results.Ok(new { message = "Webhook registered", url });
});

app.MapPost("/api/webhooks/test", async (WebhookService webhook) =>
{
    await webhook.NotifyAsync("test.event", new { message = "Test webhook" });
    return Results.Ok(new { message = "Test webhook sent" });
});

// Gestão de Inventário
app.MapGet("/api/inventory", async (ProductContext db) =>
{
    var inventory = await db.Products
        .Select(p => new {
            p.Id, p.Name, p.Stock, p.Category,
            value = p.Price * p.Stock,
            status = p.Stock == 0 ? "out_of_stock" : p.Stock <= 5 ? "low_stock" : "in_stock"
        })
        .ToListAsync();
    
    return new {
        items = inventory,
        summary = new {
            totalItems = inventory.Count,
            totalValue = inventory.Sum(i => i.value),
            outOfStock = inventory.Count(i => i.status == "out_of_stock"),
            lowStock = inventory.Count(i => i.status == "low_stock")
        }
    };
});

app.MapPost("/api/inventory/restock", async (RestockRequest request, ProductContext db) =>
{
    var product = await db.Products.FindAsync(request.ProductId);
    if (product == null) return Results.NotFound();
    
    product.Stock += request.Quantity;
    await db.SaveChangesAsync();
    
    return new { productId = request.ProductId, newStock = product.Stock, added = request.Quantity };
});

app.MapPost("/api/inventory/adjust", async (StockAdjustment adjustment, ProductContext db) =>
{
    var product = await db.Products.FindAsync(adjustment.ProductId);
    if (product == null) return Results.NotFound();
    
    var oldStock = product.Stock;
    product.Stock = adjustment.NewStock;
    await db.SaveChangesAsync();
    
    return new { productId = adjustment.ProductId, oldStock, newStock = product.Stock };
});

// Sistema de Backup
app.MapPost("/api/system/backup", async (ProductContext db) =>
{
    var backupData = new {
        products = await db.Products.ToListAsync(),
        orders = await db.Orders.Include(o => o.Items).ToListAsync(),
        timestamp = DateTime.UtcNow
    };
    
    return Results.Json(backupData);
});

app.Run();

public class ProductContext : DbContext
{
    public ProductContext(DbContextOptions<ProductContext> options) : base(options) { }
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<PriceHistory> PriceHistories => Set<PriceHistory>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Coupon> Coupons => Set<Coupon>();
    public DbSet<Wishlist> Wishlists => Set<Wishlist>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<SecurityLog> SecurityLogs => Set<SecurityLog>();
}

public class Product
{
    public int Id { get; set; }
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = "";
    
    [Required]
    [Range(0.01, 999999.99)]
    public decimal Price { get; set; }
    
    [Required]
    [Range(0, int.MaxValue)]
    public int Stock { get; set; }
    
    [Required]
    [StringLength(50, MinimumLength = 2)]
    public string Category { get; set; } = "";
    
    public string Tags { get; set; } = "";
    public bool IsFeatured { get; set; } = false;
    public decimal DiscountPercentage { get; set; } = 0;
    public string Barcode { get; set; } = "";
    public decimal FinalPrice => Price * (1 - DiscountPercentage / 100);
}

public class Order
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public decimal Total { get; set; }
    public string Status { get; set; } = "Pending";
    public List<OrderItem> Items { get; set; } = new();
}

public class OrderItem
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal Price { get; set; }
}

public class PriceHistory
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public decimal Price { get; set; }
    public DateTime ChangedAt { get; set; } = DateTime.Now;
}

public class Review
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public int Rating { get; set; }
    public string Comment { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.Now;
}

public class Coupon
{
    public int Id { get; set; }
    public string Code { get; set; } = "";
    public decimal DiscountPercentage { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;
}

public class Wishlist
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public int ProductId { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.Now;
}

public class AuditLog
{
    public int Id { get; set; }
    public string Action { get; set; } = "";
    public string EntityType { get; set; } = "";
    public int EntityId { get; set; }
    public string UserId { get; set; } = "";
    public DateTime Timestamp { get; set; } = DateTime.Now;
}

public class SecurityLog
{
    public int Id { get; set; }
    public string Event { get; set; } = "";
    public string IpAddress { get; set; } = "";
    public string UserAgent { get; set; } = "";
    public string Severity { get; set; } = "Info";
    public string Details { get; set; } = "";
    public DateTime Timestamp { get; set; } = DateTime.Now;
}

public class WebhookService
{
    private readonly List<string> _webhookUrls = new();
    private readonly HttpClient _httpClient = new();
    
    public void RegisterWebhook(string url)
    {
        if (!_webhookUrls.Contains(url))
            _webhookUrls.Add(url);
    }
    
    public async Task NotifyAsync(string eventType, object data)
    {
        var payload = new { eventType, data, timestamp = DateTime.UtcNow };
        
        foreach (var url in _webhookUrls)
        {
            try
            {
                await _httpClient.PostAsJsonAsync(url, payload);
            }
            catch { /* Log error */ }
        }
    }
}

public class QueryRequest
{
    public List<string> Fields { get; set; } = new();
    public int? Limit { get; set; }
    public Dictionary<string, object> Filters { get; set; } = new();
}

public class RestockRequest
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public string Reason { get; set; } = "";
}

public class AdvancedSearchRequest
{
    public string? Query { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public List<string>? Categories { get; set; }
    public bool InStockOnly { get; set; } = false;
    public bool FeaturedOnly { get; set; } = false;
    public bool OnSaleOnly { get; set; } = false;
    public string? SortBy { get; set; } = "name_asc";
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class StockAdjustment
{
    public int ProductId { get; set; }
    public int NewStock { get; set; }
    public string Reason { get; set; } = "";
}

public class ThrottleService
{
    private readonly Dictionary<string, List<DateTime>> _requests = new();
    private readonly int _maxRequests = 100;
    private readonly TimeSpan _timeWindow = TimeSpan.FromMinutes(1);
    
    public bool IsAllowed(string clientId)
    {
        var now = DateTime.Now;
        
        if (!_requests.ContainsKey(clientId))
        {
            _requests[clientId] = new List<DateTime>();
        }
        
        var clientRequests = _requests[clientId];
        
        // Remove old requests outside time window
        clientRequests.RemoveAll(r => now - r > _timeWindow);
        
        if (clientRequests.Count >= _maxRequests)
        {
            return false;
        }
        
        clientRequests.Add(now);
        return true;
    }
    
    public int GetRequestCount(string clientId)
    {
        if (!_requests.ContainsKey(clientId))
            return 0;
            
        var now = DateTime.Now;
        var clientRequests = _requests[clientId];
        clientRequests.RemoveAll(r => now - r > _timeWindow);
        
        return clientRequests.Count;
    }
}