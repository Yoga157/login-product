using ProductHub.Api.Dtos;
using ProductHub.Api.Models;

namespace ProductHub.Api.Repositories;

public interface IProductRepository
{
    Task<IReadOnlyList<Product>> SearchAsync(ProductQuery query, CancellationToken cancellationToken);
    Task<Product?> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task AddAsync(Product product, CancellationToken cancellationToken);
    Task DeleteAsync(Product product, CancellationToken cancellationToken);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
