using Elsa.Extensions;
using Elsa.Workflows;
using ElsaHostAdapter.Activities;
using ElsaHostAdapter.Workflows;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Elsa.EntityFrameworkCore.Extensions;
using Elsa.EntityFrameworkCore.Modules.Management;
using Elsa.EntityFrameworkCore.Modules.Runtime;

namespace ElsaHostAdapter;

public class ElsaServerHost : IElsaServerHost
{
    public async Task RunAsync(string[] args, Action<IServiceCollection>? configureServices = null, CancellationToken cancellationToken = default)
    {
        var builder = WebApplication.CreateBuilder(args);
        var options = new ElsaServerHostOptions
        {
            Urls = builder.Configuration[$"{ElsaServerHostOptions.SectionName}:Urls"] ?? "http://localhost:14000",
            CorsAllowedOrigins = builder.Configuration[$"{ElsaServerHostOptions.SectionName}:CorsAllowedOrigins"] ?? "*",
            JwtSigningKey = builder.Configuration[$"{ElsaServerHostOptions.SectionName}:JwtSigningKey"] ?? "large-signing-key-for-signing-JWT-tokens",
            HttpBaseUrl = builder.Configuration[$"{ElsaServerHostOptions.SectionName}:HttpBaseUrl"] ?? "http://localhost:14000",
            HttpBasePath = builder.Configuration[$"{ElsaServerHostOptions.SectionName}:HttpBasePath"] ?? "/workflows"
        };

        builder.WebHost.UseSetting(WebHostDefaults.ServerUrlsKey, options.Urls);
        builder.Services.AddSingleton(options);
        configureServices?.Invoke(builder.Services);

        builder.Services.AddElsa(elsa =>
        {
            // Configure Management layer to use EF Core.
            elsa.UseWorkflowManagement(management => management.UseEntityFrameworkCore(ef => ef.UseSqlite()));

            // Configure Runtime layer to use EF Core.
            elsa.UseWorkflowRuntime(runtime => runtime.UseEntityFrameworkCore(ef => ef.UseSqlite()));

            // Default Identity features for authentication/authorization.
            elsa.UseIdentity(identity =>
            {
                identity.TokenOptions = options => options.SigningKey = "sufficiently-large-secret-signing-key"; // This key needs to be at least 256 bits long.
                identity.UseAdminUserProvider();
            });

            // Configure ASP.NET authentication/authorization.
            elsa.UseDefaultAuthentication(auth => auth.UseAdminApiKey());

            // Expose Elsa API endpoints.
            elsa.UseWorkflowsApi();

            // Setup a SignalR hub for real-time updates from the server.
            elsa.UseRealTimeWorkflows();

            // Enable C# workflow expressions
            elsa.UseCSharp();

            // Enable JavaScript workflow expressions
            elsa.UseJavaScript(options => options.AllowClrAccess = true);

            // Enable HTTP activities.
            elsa.UseHttp(http => http.ConfigureHttpOptions = httpOptions =>
                {
                    httpOptions.BaseUrl = new Uri(options.HttpBaseUrl);
                });
            //elsa.UseHttp(options => options.ConfigureHttpOptions = httpOptions => httpOptions.BaseUrl = new("https://localhost:14000"));

            // Use timer activities.
            elsa.UseScheduling();

            // Register custom activities from the application, if any.
            elsa.AddActivitiesFrom<RunLegacyLogic>();

            // Register custom workflows from the application, if any.
            elsa.AddWorkflowsFrom<LegacyDemoWorkflow>();
        });

        // Configure CORS to allow designer app hosted on a different origin to invoke the APIs.
        builder.Services.AddCors(cors => cors
            .AddDefaultPolicy(policy => policy
                .AllowAnyOrigin() // For demo purposes only. Use a specific origin instead.
                .AllowAnyHeader()
                .AllowAnyMethod()
                .WithExposedHeaders("x-elsa-workflow-instance-id"))); // Required for Elsa Studio in order to support running workflows from the designer. Alternatively, you can use the `*` wildcard to expose all headers.

        // Add Health Checks.
        builder.Services.AddHealthChecks();

        // Build the web application.
        var app = builder.Build();

        // Configure web application's middleware pipeline.
        app.UseCors();
        app.UseRouting(); // Required for SignalR.
        app.UseAuthentication();
        app.UseAuthorization();
        app.UseWorkflowsApi(); // Use Elsa API endpoints.
        app.UseWorkflows(); // Use Elsa middleware to handle HTTP requests mapped to HTTP Endpoint activities.
        app.UseWorkflowsSignalRHubs(); // Optional SignalR integration. Elsa Studio uses SignalR to receive real-time updates from the server. 

        app.Lifetime.ApplicationStarted.Register(() =>
        {
            var logger = app.Services.GetRequiredService<ILogger<ElsaServerHost>>();
            logger.LogInformation("Elsa Server started. Studio API: {ApiUrl}", "http://localhost:14000/elsa/api");
        });

        app.MapPost("/demo/run", async (IWorkflowRunner workflowRunner) =>
        {
            var result = await workflowRunner.RunAsync(new LegacyDemoWorkflow());
            return Results.Ok(new { workflowInstanceId = result.WorkflowState.Id });
        });

        await app.RunAsync(cancellationToken);
    }
}
