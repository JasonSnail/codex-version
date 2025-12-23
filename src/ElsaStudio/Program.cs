using Elsa.Studio.Contracts;
using Elsa.Studio.Core.BlazorWasm.Extensions;
using Elsa.Studio.Dashboard.Extensions;
using Elsa.Studio.Extensions;
using Elsa.Studio.Login.BlazorWasm.Extensions;
using Elsa.Studio.Login.Extensions;
using Elsa.Studio.Login.HttpMessageHandlers;
using Elsa.Studio.Models;
using Elsa.Studio.Shell.Extensions;
using Elsa.Studio.Workflows.Extensions;
using Elsa.Studio.Workflows.Designer.Extensions;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;

var builder = WebAssemblyHostBuilder.CreateDefault(args);

builder.RootComponents.Add<Elsa.Studio.Shell.App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");
var jsComponentConfig = new JsComponentConfigurationAdapter(builder.RootComponents.JSComponents);
jsComponentConfig.RegisterCustomElsaStudioElements(
    typeof(Elsa.Studio.Workflows.Designer.Components.ActivityWrappers.V2.ActivityWrapper));

var backendUrl = builder.Configuration["Backend:Url"] ?? "http://localhost:14000/elsa/api";

builder.Services.AddCore();
builder.Services.AddShell();
builder.Services.AddRemoteBackend(new BackendApiConfig
{
    ConfigureHttpClientBuilder = options => options.AuthenticationHandler = typeof(AuthenticatingApiHttpMessageHandler),
    ConfigureBackendOptions = options => options.Url = new Uri(backendUrl)  
});
builder.Services.AddLoginModule();
builder.Services.UseElsaIdentity();
builder.Services.AddDashboardModule();
builder.Services.AddWorkflowsModule();

var app = builder.Build();

var startupTaskRunner = app.Services.GetRequiredService<IStartupTaskRunner>();
await startupTaskRunner.RunStartupTasksAsync();

await app.RunAsync();

internal sealed class JsComponentConfigurationAdapter : IJSComponentConfiguration
{
    public JsComponentConfigurationAdapter(JSComponentConfigurationStore store)
    {
        JSComponents = store;
    }

    public JSComponentConfigurationStore JSComponents { get; }
}
