using System.ComponentModel.DataAnnotations;

namespace ProductHub.Api.Dtos;

public sealed record ProductRequest(
    [Required, StringLength(150, MinimumLength = 2)] string Name,
    [StringLength(1000)] string Description,
    [Range(typeof(decimal), "0.01", "999999999.99", ParseLimitsInInvariantCulture = true)] decimal Price);

public sealed record ProductResponse(
    int Id, string Name, string Description, decimal Price, DateTime CreatedAt);

public sealed class ProductQuery
{
    [StringLength(150)]
    public string? Name { get; init; }

    [Range(typeof(decimal), "0", "999999999.99", ParseLimitsInInvariantCulture = true)]
    public decimal? MinPrice { get; init; }

    [Range(typeof(decimal), "0", "999999999.99", ParseLimitsInInvariantCulture = true)]
    public decimal? MaxPrice { get; init; }
}
