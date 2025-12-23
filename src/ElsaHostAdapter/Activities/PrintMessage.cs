using Elsa.Extensions;
using Elsa.Workflows;
using Elsa.Workflows.Attributes;
using Elsa.Workflows.Models;

namespace ElsaHostAdapter.Activities;

[Activity("Diagnostics", "Print Message", Description = "Prints a message to the console.")]
public class PrintMessage : CodeActivity
{
    [Input(Description = "The message to print.")]
    public Input<string> Message { get; set; } = default!;

    protected override void Execute(ActivityExecutionContext context)
    {
        var message = Message.GetOrDefault(context, () => "PrintMessage input was not set.");
        Console.WriteLine(message);
    }
}
