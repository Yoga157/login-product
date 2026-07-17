using Microsoft.EntityFrameworkCore;
using ProductHub.Api.Data;
using ProductHub.Api.Dtos;
using ProductHub.Api.Models;

namespace ProductHub.Api.Repositories;

public sealed class ProductRepository(AppDbContext dbContext) : IProductRepository
{
    public async Task<IReadOnlyList<Product>> SearchAsync(ProductQuery query, CancellationToken cancellationToken)
    {
        IQueryable<Product> products = dbContext.Products.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(query.Name))
        {
            products = products.Where(product => product.Name.Contains(query.Name));
        }
        if (query.MinPrice.HasValue)
        {
            products = products.Where(product => product.Price >= query.MinPrice.Value);
        }
        if (query.MaxPrice.HasValue)
        {
            products = products.Where(product => product.Price <= query.MaxPrice.Value);
        }

        return await products.OrderByDescending(product => product.CreatedAt).ToListAsync(cancellationToken);
    }

    public Task<Product?> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        dbContext.Products.FirstOrDefaultAsync(product => product.Id == id, cancellationToken);

    public Task AddAsync(Product product, CancellationToken cancellationToken) =>
        dbContext.Products.AddAsync(product, cancellationToken).AsTask();

    public Task DeleteAsync(Product product, CancellationToken cancellationToken)
    {
        dbContext.Products.Remove(product);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
