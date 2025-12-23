using AspNetCore.Authentication.ApiKey;
using Elsa.Identity.Models;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Security.Claims;
using System.Linq;

namespace ElsaHostAdapter.Authentication;

public class FixedAdminApiKeyProvider : IApiKeyProvider
{
    private readonly ElsaServerHostOptions _options;
    private readonly ILogger<FixedAdminApiKeyProvider> _logger;

    public FixedAdminApiKeyProvider(ElsaServerHostOptions options, ILogger<FixedAdminApiKeyProvider> logger)
    {
        _options = options;
        _logger = logger;
    }

    public Task<IApiKey?> ProvideAsync(string key)
    {
        if (string.IsNullOrWhiteSpace(_options.AdminApiKey))
            return Task.FromResult<IApiKey?>(null);

        if (!string.Equals(key, _options.AdminApiKey, StringComparison.Ordinal))
            return Task.FromResult<IApiKey?>(null);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.Name, "elsa-admin"),
            new Claim(ClaimTypes.Role, "Admin"),
            new Claim("name", "elsa-admin"),
            new Claim("role", "Admin")
        };
        claims.AddRange(AdminApiKeyPermissions.All.Select(permission => new Claim("permissions", permission)));

        _logger.LogInformation("API key authenticated for admin access.");
        return Task.FromResult<IApiKey?>(new ApiKey(key, "elsa-admin", claims));
    }
}
