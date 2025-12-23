namespace ElsaHostAdapter;

public class ElsaServerHostOptions
{
    public const string SectionName = "ElsaHost";

    public string Urls { get; set; } = "http://localhost:14000";

    public string CorsAllowedOrigins { get; set; } = "*";

    public string JwtSigningKey { get; set; } = "large-signing-key-for-signing-JWT-tokens";

    public string HttpBaseUrl { get; set; } = "http://localhost:14000";

    public string HttpBasePath { get; set; } = "/workflows";
}

