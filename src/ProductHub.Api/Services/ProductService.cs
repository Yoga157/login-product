using Microsoft.Extensions.Caching.Memory;
using ProductHub.Api.Dtos;
using ProductHub.Api.Exceptions;
using ProductHub.Api.Models;
using ProductHub.Api.Repositories;

namespace ProductHub.Api.Services;

public sealed class ProductService(
    IProductRepository repository,
    IMemoryCache cache,
    ILogger<ProductService> logger) : IProductService
{
    private const string AllProductsCacheKey = "products:all";

    public async Task<IReadOnlyList<ProductResponse>> SearchAsync(
        ProductQuery query, CancellationToken cancellationToken)
    {
        if (query.MinPrice.HasValue && query.MaxPrice.HasValue &&
            query.MinPrice.Value > query.MaxPrice.Value)
        {
            throw new ValidationException("MinPrice cannot be greater than MaxPrice.");
        }

        var isUnfiltered = string.IsNullOrWhiteSpace(query.Name) &&
                           !query.MinPrice.HasValue && !query.MaxPrice.HasValue;
        if (isUnfiltered &&
            cache.TryGetValue(AllProductsCacheKey, out IReadOnlyList<ProductResponse>? cached) &&
            cached is not null)
        {
            return cached;
        }

        var products = (await repository.SearchAsync(query, cancellationToken))
            .Select(Map)
            .ToArray();

        if (isUnfiltered)
        {
            cache.Set(AllProductsCacheKey, products, TimeSpan.FromMinutes(5));
        }
        return products;
    }

    public async Task<ProductResponse> GetAsync(int id, CancellationToken cancellationToken)
    {
        var product = await repository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException($"Product with id {id} was not found.");
        return Map(product);
    }

    public async Task<ProductResponse> CreateAsync(ProductRequest request, CancellationToken cancellationToken)
    {
        var product = new Product
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            Price = request.Price,
            CreatedAt = DateTime.UtcNow
        };
        await repository.AddAsync(product, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);
        InvalidateCache();
        logger.LogInformation("Product {ProductId} created", product.Id);
        return Map(product);
    }

    public async Task<ProductResponse> UpdateAsync(
        int id, ProductRequest request, CancellationToken cancellationToken)
    {
        var product = await repository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException($"Product with id {id} was not found.");
        product.Name = request.Name.Trim();
        product.Description = request.Description?.Trim() ?? string.Empty;
        product.Price = request.Price;
        await repository.SaveChangesAsync(cancellationToken);
        InvalidateCache();
        logger.LogInformation("Product {ProductId} updated", id);
        return Map(product);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var product = await repository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException($"Product with id {id} was not found.");
        await repository.DeleteAsync(product, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);
        InvalidateCache();
        logger.LogInformation("Product {ProductId} deleted", id);
    }

    private void InvalidateCache() => cache.Remove(AllProductsCacheKey);
    private static ProductResponse Map(Product product) =>
        new(product.Id, product.Name, product.Description, product.Price, product.CreatedAt);
}
