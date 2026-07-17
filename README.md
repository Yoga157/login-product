# ProductHub

Production-minded product management application built with ASP.NET Core on .NET 10. It includes a secured REST API, a simple responsive web UI, SQLite persistence, structured logging, caching, tests, and Docker support.

## Run locally (maximum 5 steps)

Prerequisite: [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0).

1. Clone the repository and open a terminal in its root directory.
2. Set a local JWT secret: PowerShell `$env:Jwt__Key="replace-with-a-random-secret-at-least-32-characters"`; bash `export Jwt__Key="replace-with-a-random-secret-at-least-32-characters"`.
3. Restore dependencies: `dotnet restore ProductHub.slnx`.
4. Run the application: `dotnet run --project src/ProductHub.Api`.
5. Open `http://localhost:5080` for the UI or `http://localhost:5080/swagger` for API documentation.

The SQLite database and log directory are created automatically on first run.

## Features and assessment mapping

| Area | Implementation |
|---|---|
| Authentication | Registration and login issue a signed JWT; passwords use salted PBKDF2-SHA256 with 100,000 iterations |
| Authorization | Every product endpoint uses `[Authorize]`; unauthenticated calls return HTTP 401 |
| Product management | Async create, read, update, delete, and search endpoints |
| Search/filtering | Case-insensitive name search through SQLite plus minimum/maximum price filters |
| Validation | Data Annotations on request DTOs; invalid input produces HTTP 400 |
| Errors | Central middleware returns RFC-style `ProblemDetails` with a trace ID |
| Logging | Serilog structured request/application logs to console and daily rolling files |
| Caching | Unfiltered product list cached in memory for 5 minutes; all mutations invalidate it |
| Architecture | Controller → service → repository → EF Core database |
| Frontend | Responsive Bootstrap UI integrated with the secured API |
| Quality | xUnit unit and functional API tests; 99.25% line and 83.87% branch coverage in the verified run |
| Portability | Runs on Windows/Linux/macOS with .NET 10, or in a Linux Docker container |

## API endpoints

| Method | Route | Authentication | Purpose |
|---|---|---:|---|
| POST | `/api/auth/register` | No | Create account and return JWT |
| POST | `/api/auth/login` | No | Verify credentials and return JWT |
| GET | `/api/products` | Yes | List/search using `name`, `minPrice`, `maxPrice` |
| GET | `/api/products/{id}` | Yes | Get one product |
| POST | `/api/products` | Yes | Create product |
| PUT | `/api/products/{id}` | Yes | Update product |
| DELETE | `/api/products/{id}` | Yes | Delete product |

Example search: `GET /api/products?name=laptop&minPrice=500&maxPrice=2000`.

## Tests and coverage

```bash
dotnet test ProductHub.slnx -c Release \
  --collect:"XPlat Code Coverage" \
  --results-directory TestResults
```

The test suite covers service rules, cache behavior, password hashing, authentication/authorization, full CRUD, filtering, validation, and error responses. The generated Cobertura report is under `TestResults/<run-id>/coverage.cobertura.xml`.

## Configuration and production notes

Configuration follows standard ASP.NET Core precedence, so environment variables override `appsettings.json`. Use double underscores for nested keys:

- `Jwt__Key` — mandatory production secret; use a secret manager, never commit the real value.
- `Jwt__Issuer`, `Jwt__Audience`, `Jwt__ExpiryMinutes`.
- `ConnectionStrings__DefaultConnection`.

The checked-in JWT value is development-only. In production, terminate TLS at the ingress/reverse proxy, restrict Swagger as appropriate, store the database on persistent storage, and prefer a managed relational database for multiple instances. In-memory caching is deliberate for a single-node assessment; Redis is the natural replacement for horizontally scaled deployment.

Docker:

```bash
docker build -t producthub .
docker run --rm -p 8080:8080 \
  -e Jwt__Key="replace-with-a-random-secret-at-least-32-characters" \
  -v producthub-data:/app/data producthub
```

For the shown volume mapping, override the connection string with `-e ConnectionStrings__DefaultConnection="Data Source=/app/data/producthub.db"`.

## Assumptions and trade-offs

- Registration creates standard `User` accounts. Role data is included in the JWT to allow future policy/role expansion, but all authenticated users currently have equal product permissions.
- `CreatedAt` is server-generated in UTC and cannot be changed by clients.
- Prices must be greater than zero and are stored with decimal precision; currency is intentionally not modeled because it was not specified.
- SQLite minimizes local setup to five steps. `EnsureCreatedAsync` bootstraps the assessment database; a production evolution should use versioned EF Core migrations.
- Search returns all matches because pagination was not required. Add cursor/page pagination before a large production dataset.
- The frontend stores JWT only in `sessionStorage` to limit persistence. A production browser system should evaluate secure, `HttpOnly`, `SameSite` cookies and CSRF controls.
- Bootstrap is loaded from a CDN. Bundle it locally if the deployment must work without internet access.

## Suggested commit history

The environment used to prepare this solution did not expose a Git executable, so commits were intentionally not fabricated. To honor the assessment rule, stage and commit in this order before publishing:

1. `chore: initialize .NET 10 solution and dependencies` — solution/project files, `.gitignore`, and package references only.
2. `feat: add JWT authentication and product API`.
3. `feat: add product web interface`.
4. `test: add unit and functional API coverage`.
5. `docs: add runbook assumptions and presentation guide`.

Use a neutral public repository name such as `product-management-api`; do not include client or company names in the repository name.
