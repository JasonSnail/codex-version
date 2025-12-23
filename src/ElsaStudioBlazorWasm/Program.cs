using Elsa.Studio.Branding;
using Elsa.Studio.Dashboard.Extensions;
using Elsa.Studio.Shell;
using Elsa.Studio.Shell.Extensions;
using Elsa.Studio.Workflows.Extensions;
using Elsa.Studio.Contracts;
using Elsa.Studio.Models;
using Elsa.Studio.Core.BlazorWasm.Extensions;
using Elsa.Studio.Extensions;
using Elsa.Studio.Login.BlazorWasm.Extensions;
using Elsa.Studio.Login.Extensions;
using Elsa.Studio.Login.HttpMessageHandlers;
using Elsa.Studio.Workflows.Designer.Extensions;
using ElsaStudioBlazorWasm.Branding;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;

// Build the host.
var builder = WebAssemblyHostBuilder.CreateDefault(args);
var configuration = builder.Configuration;

// Register root components.
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");
var jsComponentConfig = new JsComponentConfigurationAdapter(builder.RootComponents.JSComponents);
jsComponentConfig.RegisterCustomElsaStudioElements(
    typeof(Elsa.Studio.Workflows.Designer.Components.ActivityWrappers.V2.ActivityWrapper));

// Register shell services and modules.
var backendApiConfig = new BackendApiConfig
{
    ConfigureBackendOptions = options => builder.Configuration.GetSection("Backend").Bind(options),
    ConfigureHttpClientBuilder = options => options.AuthenticationHandler = typeof(AuthenticatingApiHttpMessageHandler)
};

builder.Services.AddCore();
builder.Services.AddShell();
builder.Services.AddRemoteBackend(backendApiConfig);
builder.Services.AddLoginModule();
builder.Services.UseElsaIdentity();
builder.Services.AddDashboardModule();
builder.Services.AddWorkflowsModule();
builder.Services.AddSingleton<IBrandingProvider, NextGenBrandingProvider>();


// Build the application.
var app = builder.Build();

// Run each startup task.
var startupTaskRunner = app.Services.GetRequiredService<IStartupTaskRunner>();
await startupTaskRunner.RunStartupTasksAsync();

// Run the application.
await app.RunAsync();

internal sealed class JsComponentConfigurationAdapter : IJSComponentConfiguration
{
    public JsComponentConfigurationAdapter(JSComponentConfigurationStore store)
    {
        JSComponents = store;
    }

    public JSComponentConfigurationStore JSComponents { get; }
}
