export declare class PullRequestLabelManager {
    private readonly dryRun;
    private readonly client;
    private readonly owner;
    private readonly repo;
    private readonly pullNumber;
    constructor(token: string, dryRun?: boolean);
    copyLabelsFromReferencedIssues(): Promise<void>;
    private findReferencedIssues;
    private issueLabels;
}
