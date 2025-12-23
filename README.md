# VB.NET (.NET 8) Console + Elsa 3.5.3 Demo

這個 repo 示範把既有 VB.NET Console App 變成「同一個 process」同時扮演：
- Elsa Server (API + runtime)  
- Activity provider（把 VB legacy 邏輯包成 Activity，讓 Elsa Studio 可拖拉）  
- Legacy 邏輯執行主體（VB 實作，透過 DI 注入給 Activity 使用）  

重點：VB 專案不直接依賴 Elsa 套件；Elsa 相關設定集中在 C# `ElsaHostAdapter`，用 `IElsaServerHost` 抽離。

## 專案結構
- `src/LegacyHost`：VB.NET Console（入口點），啟動 Elsa Server 並註冊 VB legacy services
- `src/LegacyLogic`：VB.NET legacy 邏輯（`ILegacyOperations`/`LegacyOperations`）
- `src/ElsaHostAdapter`：C# Elsa Host + custom activities/workflows（避免 VB 直接呼叫 Elsa extension methods）
- `src/ElsaStudio`：Blazor WASM 的 Elsa Studio（連到 `LegacyHost` 的 `/elsa/api`）
- `src/ElsaStudioBlazorWasm`：Blazor WASM 的 Elsa Studio（示範品牌化與更輕量的套件組合）

## 執行方式
1) 啟動 Elsa Server（VB console）
- `dotnet run --project src/LegacyHost/LegacyHost.vbproj`
- 驗證：`curl http://localhost:14000/demo/ping`
- 直接跑一次內建 demo workflow：`curl -X POST http://localhost:14000/demo/run`
- Elsa API：`http://localhost:14000/elsa/api`

2) 啟動 Elsa Studio
- `dotnet run --project src/ElsaStudio/ElsaStudio.csproj`
- Studio 會讀 `src/ElsaStudio/wwwroot/appsettings.json` 的 `Backend:Url`

3) 或啟動 ElsaStudioBlazorWasm
- `dotnet run --project src/ElsaStudioBlazorWasm/ElsaStudioBlazorWasm.csproj`
- Studio 會讀 `src/ElsaStudioBlazorWasm/wwwroot/appsettings.json` 的 `Backend:Url`

4) Studio 登入（預設）
- `admin / password`

> 目前 Elsa Host 以 EF Core + SQLite 為預設儲存（檔案型）。如要完全 In-Memory，需調整 `src/ElsaHostAdapter/ElsaServerHost.cs` 的儲存設定。

## 自訂 Activity（VB legacy 包裝）
- VB legacy：`src/LegacyLogic/ILegacyOperations.vb`
- Activity：`src/ElsaHostAdapter/Activities/RunLegacyLogic.cs`
- VB 只負責註冊 legacy service：`src/LegacyHost/Program.vb`

在 Elsa Studio 的 Activity toolbox 會看到分類 `Legacy` 的 `Run Legacy Logic`。

## 設定
- Elsa Host：`src/LegacyHost/appsettings.json`（`ElsaHost:*`）
- Studio backend：`src/ElsaStudio/wwwroot/appsettings.json`（`Backend:Url`）
- Studio backend（BlazorWasm）：`src/ElsaStudioBlazorWasm/wwwroot/appsettings.json`（`Backend:Url`）

## ElsaStudioBlazorWasm 品牌化
Elsa Studio 使用 `Elsa.Studio.Shell.App` 作為根元件，不會使用 `Layout/NavMenu.razor`。
若要更換左上角 Logo 與名稱，需實作 `IBrandingProvider`：
- Branding provider：`src/ElsaStudioBlazorWasm/Branding/NextGenBrandingProvider.cs`
- 註冊位置：`src/ElsaStudioBlazorWasm/Program.cs`
- Logo 檔案：`src/ElsaStudioBlazorWasm/wwwroot/assets/nextgen-tap-logo.svg`

## NuGet 來源
`NuGet.config` 另外加入 Elsa 3 feed，讓 `src/ElsaStudio` 可以還原 `Elsa.Api.Client` 的 `3.5.3` 版本。
