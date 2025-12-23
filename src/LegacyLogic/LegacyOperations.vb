Imports System
Imports System.Threading
Imports System.Threading.Tasks

Public Class LegacyOperations
    Implements ILegacyOperations

    Public Function ProcessAsync(input As String, cancellationToken As CancellationToken) As Task(Of String) Implements ILegacyOperations.ProcessAsync
        cancellationToken.ThrowIfCancellationRequested()
        Dim output = $"{DateTimeOffset.Now:O} | VB.NET legacy processed: {input}"
        Return Task.FromResult(output)
    End Function
End Class
