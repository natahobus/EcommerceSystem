using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.ComponentModel.DataAnnotations;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<ProductContext>(opt => opt.UseInMemoryDatabase("Products"));
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<ThrottleService>();
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

// Produtos
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

app.MapPost("/api/products", async (Product product, ProductContext db, ILogger<Program> logger, IMemoryCache cache) =>
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

// Estatísticas
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

// Busca avançada
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

// Pedidos
app.MapPost("/api/orders", async (Order order, ProductContext db) =>
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
});piresAt > DateTime.Now);
    return coupon != null ? Results.Ok(coupon) : Results.NotFound();
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

public class ThrottleService
{
    private readonly Dictionary<string, DateTime> _requests = new();
    
    public bool IsAllowed(string clientId)
    {
        if (_requests.TryGetValue(clientId, out var lastRequest))
        {
            if (DateTime.Now - lastRequest < TimeSpan.FromSeconds(1))
                return false;
        }
        _requests[clientId] = DateTime.Now;
        return true;
    }
}