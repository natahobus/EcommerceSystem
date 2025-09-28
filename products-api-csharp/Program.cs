using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.ComponentModel.DataAnnotations;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<ProductContext>(opt => opt.UseInMemoryDatabase("Products"));
builder.Services.AddMemoryCache();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");

// Produtos
app.MapGet("/api/products", async (ProductContext db, IMemoryCache cache) =>
{
    const string cacheKey = "products_list";
    if (cache.TryGetValue(cacheKey, out List<Product>? cachedProducts))
        return cachedProducts;
    
    var products = await db.Products.ToListAsync();
    cache.Set(cacheKey, products, TimeSpan.FromMinutes(5));
    return products;
});

app.MapGet("/api/products/{id}", async (int id, ProductContext db) =>
    await db.Products.FindAsync(id) is Product product ? Results.Ok(product) : Results.NotFound());

app.MapPost("/api/products", async (Product product, ProductContext db, ILogger<Program> logger) =>
{
    logger.LogInformation("Tentativa de criar produto: {ProductName}", product.Name);
    
    if (string.IsNullOrWhiteSpace(product.Name) || product.Price <= 0 || product.Stock < 0)
    {
        logger.LogWarning("Dados inválidos para produto: {ProductName}", product.Name);
        return Results.BadRequest("Dados inválidos");
    }
    
    db.Products.Add(product);
    await db.SaveChangesAsync();
    
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

app.Run();

public class ProductContext : DbContext
{
    public ProductContext(DbContextOptions<ProductContext> options) : base(options) { }
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
}

public class Product
{
    public int Id { get; set; }
    [Required] public string Name { get; set; } = "";
    [Required] public decimal Price { get; set; }
    [Required] public int Stock { get; set; }
    [Required] public string Category { get; set; } = "";
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