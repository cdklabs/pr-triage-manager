export interface PullRequsetLabelManagerOptions {
    /**
     * @default - ['p0', 'p1', 'p2']
     */
    readonly priorityLabels?: string[];
    /**
     * @default - ['bug', 'feature-request']
     */
    readonly classificationLabels?: string[];
    /**
     * @default - ['effort-large', 'effort-medium', 'effort-small']
     */
    readonly effortLabels?: string[];
}
export declare class PullRequestLabelManager {
    private readonly client;
    private readonly owner;
    private readonly repo;
    private readonly pullNumber;
    private readonly priorityLabels;
    private readonly classificationLabels;
    private readonly effortLabels;
    constructor(token: string, options: PullRequsetLabelManagerOptions);
    copyLabelsFromReferencedIssues(): Promise<void>;
    private findReferencedIssues;
    private issueLabels;
    /**
     * We mandate priority labels even if there are no priorities found in linked issues.
     * In the absence of a known priority, we will label the PR with the lowest priority available.
     */
    private highestPriorityLabel;
    private classification;
    private largestEffort;
}
