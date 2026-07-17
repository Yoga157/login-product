using ProductHub.Api.Services;

namespace ProductHub.Tests;

public sealed class PasswordHasherTests
{
    private readonly PasswordHasher hasher = new();

    [Fact]
    public void HashAndVerify_WithCorrectPassword_ReturnsTrue()
    {
        var hash = hasher.Hash("VerySecret123!");
        Assert.True(hasher.Verify("VerySecret123!", hash));
        Assert.False(hasher.Verify("WrongPassword", hash));
    }

    [Theory]
    [InlineData("")]
    [InlineData("invalid")]
    [InlineData("100.bad-base64.bad-base64")]
    public void Verify_WithMalformedHash_ReturnsFalse(string hash) =>
        Assert.False(hasher.Verify("password", hash));
}
