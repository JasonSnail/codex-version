Imports System
Imports System.Threading.Tasks
Imports ElsaHostAdapter
Imports LegacyLogic
Imports Microsoft.Extensions.DependencyInjection

Module Program
    Sub Main(args As String())
        Dim host As IElsaServerHost = New ElsaServerHost()

        host.RunAsync(
            args,
            Sub(services)
                services.AddSingleton(Of ILegacyOperations, LegacyOperations)()
            End Sub
        ).GetAwaiter().GetResult()
    End Sub
End Module
