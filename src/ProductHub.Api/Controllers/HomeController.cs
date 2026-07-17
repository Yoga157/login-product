using Microsoft.AspNetCore.Mvc;

namespace ProductHub.Api.Controllers;

public sealed class HomeController : Controller
{
    [HttpGet("/")]
    public IActionResult Index() => View();
}
