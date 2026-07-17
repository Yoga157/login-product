using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using ProductHub.Api.Dtos;

namespace ProductHub.Tests;

public sealed class ApiIntegrationTests : IClassFixture<ProductHubFactory>
{
    private readonly HttpClient client;

    public ApiIntegrationTests(ProductHubFactory factory) => client = factory.CreateClient();

    [Fact]
    public async Task HomePage_RendersRazorView()
    {
        var response = await client.GetAsync("/", TestContext.Current.CancellationToken);
        var html = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("ASP.NET Core Razor", html);
        Assert.Contains("Product Management - ProductHub", html);
    }

    [Fact]
    public async Task ProductEndpoints_RequireAuthentication()
    {
        var response = await client.GetAsync("/api/products", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task RegisterLoginAndProductCrud_WorkEndToEnd()
    {
        var email = $"{Guid.NewGuid():N}@example.com";
        var register = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(email, "StrongPass123!"), TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, register.StatusCode);
        var auth = await register.Content.ReadFromJsonAsync<AuthResponse>(
            cancellationToken: TestContext.Current.CancellationToken);
        Assert.NotNull(auth);

        var duplicate = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(email, "StrongPass123!"), TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);

        var invalidLogin = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, "WrongPass"), TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, invalidLogin.StatusCode);

        var login = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, "StrongPass123!"), TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var loginAuth = await login.Content.ReadFromJsonAsync<AuthResponse>(
            cancellationToken: TestContext.Current.CancellationToken);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", loginAuth!.Token);

        var invalid = await client.PostAsJsonAsync("/api/products",
            new ProductRequest("", "", 0), TestContext.Current.CancellationToken);
        Assert.True(invalid.StatusCode == HttpStatusCode.BadRequest,
            $"Expected BadRequest but got {invalid.StatusCode}. Body: {await invalid.Content.ReadAsStringAsync(TestContext.Current.CancellationToken)}");

        var create = await client.PostAsJsonAsync("/api/products",
            new ProductRequest("Laptop", "Development laptop", 1500), TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var product = await create.Content.ReadFromJsonAsync<ProductResponse>(
            cancellationToken: TestContext.Current.CancellationToken);
        Assert.NotNull(product);

        var get = await client.GetFromJsonAsync<ProductResponse>(
            $"/api/products/{product.Id}", TestContext.Current.CancellationToken);
        Assert.Equal("Laptop", get!.Name);

        var search = await client.GetFromJsonAsync<ProductResponse[]>(
            "/api/products?name=Lap&minPrice=1000&maxPrice=2000",
            TestContext.Current.CancellationToken);
        Assert.Single(search!);

        var update = await client.PutAsJsonAsync($"/api/products/{product.Id}",
            new ProductRequest("Laptop Pro", "Updated", 1750), TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        var delete = await client.DeleteAsync(
            $"/api/products/{product.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);

        var missing = await client.GetAsync(
            $"/api/products/{product.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
        Assert.Equal("application/problem+json", missing.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Search_WithReversedPriceRange_ReturnsProblemDetails()
    {
        await AuthenticateAsync();
        var response = await client.GetAsync(
            "/api/products?minPrice=20&maxPrice=10", TestContext.Current.CancellationToken);
        Assert.True(response.StatusCode == HttpStatusCode.BadRequest,
            $"Expected BadRequest but got {response.StatusCode}. Body: {await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken)}");
    }

    private async Task AuthenticateAsync()
    {
        var response = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest($"{Guid.NewGuid():N}@example.com", "StrongPass123!"),
            TestContext.Current.CancellationToken);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>(
            cancellationToken: TestContext.Current.CancellationToken);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
    }
}

public sealed class ProductHubFactory : WebApplicationFactory<Program>
{
    private readonly string databasePath = Path.Combine(
        Path.GetTempPath(), $"producthub-tests-{Guid.NewGuid():N}.db");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = $"Data Source={databasePath}"
            });
        });
    }
}
