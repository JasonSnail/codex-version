using Elsa.Extensions;
using Elsa.Workflows;
using Elsa.Workflows.Activities;
using ElsaHostAdapter.Activities;

namespace ElsaHostAdapter.Workflows;

public class LegacyDemoWorkflow : WorkflowBase
{
    protected override void Build(IWorkflowBuilder builder)
    {
        var legacyOutput = builder.WithVariable<string>("LegacyOutput");

        var runLegacyLogic = new RunLegacyLogic
        {
            Input = new("Hello from Elsa -> VB.NET legacy logic"),
            Result = new(legacyOutput)
        };

        builder.Root = new Sequence
        {
            Activities =
            {
                runLegacyLogic,
                new PrintMessage
                {
                    Message = new(context => $"Legacy output: {legacyOutput.Get(context)}")
                }
            }
        };
    }
}
