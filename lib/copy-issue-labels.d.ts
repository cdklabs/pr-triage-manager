export declare class IssueLabelCopier {
    private readonly dryRun;
    private readonly client;
    private readonly owner;
    private readonly repo;
    private readonly pullNumber;
    constructor(token: string, dryRun?: boolean);
    doPullRequest(): Promise<void>;
    private findReferencedIssues;
    private issueLabels;
}
