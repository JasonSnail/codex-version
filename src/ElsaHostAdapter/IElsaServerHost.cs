using Microsoft.Extensions.DependencyInjection;

namespace ElsaHostAdapter;

public interface IElsaServerHost
{
    Task RunAsync(string[] args, Action<IServiceCollection>? configureServices = null, CancellationToken cancellationToken = default);
}

