namespace ElsaHostAdapter.Authentication;

public static class AdminApiKeyPermissions
{
    public static readonly string[] All =
    {
        "actions:workflow-definitions:refresh",
        "actions:workflow-definitions:reload",
        "cancel:workflow-instances",
        "delete:workflow-definitions",
        "delete:workflow-instances",
        "exec:workflow-definitions",
        "publish:workflow-definitions",
        "read:*",
        "read:activity-descriptors",
        "read:activity-descriptors-options",
        "read:activity-execution",
        "read:commit-strategies",
        "read:expression-descriptors",
        "read:incident-strategies",
        "read:installed-features",
        "read:log-persistence-strategies",
        "read:storage-drivers",
        "read:variable-descriptors",
        "read:workflow-activation-strategies",
        "read:workflow-definitions",
        "read:workflow-instances",
        "retract:workflow-definitions",
        "tasks:complete",
        "trigger:event",
        "write:workflow-definitions",
        "write:workflow-instances"
    };
}
