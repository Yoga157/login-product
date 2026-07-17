using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using ProductHub.Api.Dtos;
using ProductHub.Api.Exceptions;
using ProductHub.Api.Models;
using ProductHub.Api.Repositories;
using ProductHub.Api.Services;

namespace ProductHub.Tests;

public sealed class ProductServiceTests
{
    private readonly Mock<IProductRepository> repository = new();
    private readonly IMemoryCache cache = new MemoryCache(new MemoryCacheOptions());
    private ProductService Service => new(repository.Object, cache, NullLogger<ProductService>.Instance);
    private static CancellationToken CancellationToken => TestContext.Current.CancellationToken;

    [Fact]
    public async Task SearchAsync_ReturnsMappedProducts()
    {
        repository.Setup(x => x.SearchAsync(It.IsAny<ProductQuery>(), CancellationToken))
            .ReturnsAsync([new Product { Id = 1, Name = "Laptop", Description = "Fast", Price = 10 }]);
        var result = await Service.SearchAsync(new ProductQuery(), CancellationToken);
        Assert.Single(result);
        Assert.Equal("Laptop", result[0].Name);
    }

    [Fact]
    public async Task SearchAsync_UsesCacheForSecondUnfilteredRequest()
    {
        repository.Setup(x => x.SearchAsync(It.IsAny<ProductQuery>(), CancellationToken))
            .ReturnsAsync([new Product { Id = 1, Name = "Cached", Price = 10 }]);
        var service = Service;
        await service.SearchAsync(new ProductQuery(), CancellationToken);
        await service.SearchAsync(new ProductQuery(), CancellationToken);
        repository.Verify(x => x.SearchAsync(It.IsAny<ProductQuery>(), CancellationToken), Times.Once);
    }

    [Fact]
    public async Task SearchAsync_RejectsInvalidPriceRange()
    {
        await Assert.ThrowsAsync<ValidationException>(() =>
            Service.SearchAsync(new ProductQuery { MinPrice = 20, MaxPrice = 10 }, CancellationToken));
    }

    [Fact]
    public async Task GetAsync_ThrowsWhenMissing()
    {
        repository.Setup(x => x.GetByIdAsync(99, CancellationToken)).ReturnsAsync((Product?)null);
        await Assert.ThrowsAsync<NotFoundException>(() => Service.GetAsync(99, CancellationToken));
    }

    [Fact]
    public async Task CreateAsync_PersistsAndMapsProduct()
    {
        var result = await Service.CreateAsync(new ProductRequest(" Phone ", " New ", 500), CancellationToken);
        Assert.Equal("Phone", result.Name);
        repository.Verify(x => x.AddAsync(It.Is<Product>(p => p.Name == "Phone"), CancellationToken));
        repository.Verify(x => x.SaveChangesAsync(CancellationToken));
    }

    [Fact]
    public async Task UpdateAsync_ChangesExistingProduct()
    {
        var product = new Product { Id = 2, Name = "Old", Price = 1 };
        repository.Setup(x => x.GetByIdAsync(2, CancellationToken)).ReturnsAsync(product);
        var result = await Service.UpdateAsync(2, new ProductRequest("New", "Desc", 2), CancellationToken);
        Assert.Equal("New", result.Name);
        Assert.Equal(2, product.Price);
        repository.Verify(x => x.SaveChangesAsync(CancellationToken));
    }

    [Fact]
    public async Task DeleteAsync_RemovesExistingProduct()
    {
        var product = new Product { Id = 3, Name = "Delete", Price = 1 };
        repository.Setup(x => x.GetByIdAsync(3, CancellationToken)).ReturnsAsync(product);
        await Service.DeleteAsync(3, CancellationToken);
        repository.Verify(x => x.DeleteAsync(product, CancellationToken));
        repository.Verify(x => x.SaveChangesAsync(CancellationToken));
    }
}
