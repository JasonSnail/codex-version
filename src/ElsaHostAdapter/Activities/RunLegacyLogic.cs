using Elsa.Extensions;
using Elsa.Workflows;
using Elsa.Workflows.Attributes;
using Elsa.Workflows.Models;
using LegacyLogic;

namespace ElsaHostAdapter.Activities;

[Activity("Legacy", "Run Legacy Logic", Description = "Executes VB.NET legacy logic as an Elsa activity.")]
public class RunLegacyLogic : CodeActivity<string>
{
    [Input(Description = "Input to pass into the legacy logic.")]
    public Input<string> Input { get; set; } = default!;

    protected override async ValueTask ExecuteAsync(ActivityExecutionContext context)
    {
        var legacy = context.GetRequiredService<ILegacyOperations>();
        var input = Input.Get(context);
        var output = await legacy.ProcessAsync(input, context.CancellationToken);
        context.SetResult(output);
    }
}

