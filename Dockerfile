FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore ProductHub.slnx
RUN dotnet publish src/ProductHub.Api/ProductHub.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
# Heroku injects PORT dynamically. Other hosts and local Docker fall back to 8080.
CMD ["sh", "-c", "ASPNETCORE_URLS=http://+:${PORT:-8080} exec dotnet ProductHub.Api.dll"]
