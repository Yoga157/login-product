using ProductHub.Api.Dtos;

namespace ProductHub.Api.Services;

public interface IProductService
{
    Task<IReadOnlyList<ProductResponse>> SearchAsync(ProductQuery query, CancellationToken cancellationToken);
    Task<ProductResponse> GetAsync(int id, CancellationToken cancellationToken);
    Task<ProductResponse> CreateAsync(ProductRequest request, CancellationToken cancellationToken);
    Task<ProductResponse> UpdateAsync(int id, ProductRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(int id, CancellationToken cancellationToken);
}
