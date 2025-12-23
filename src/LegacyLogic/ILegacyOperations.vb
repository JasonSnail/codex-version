Imports System.Threading
Imports System.Threading.Tasks

Public Interface ILegacyOperations
    Function ProcessAsync(input As String, cancellationToken As CancellationToken) As Task(Of String)
End Interface
