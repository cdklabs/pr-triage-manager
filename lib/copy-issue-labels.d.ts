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
    /**
     * @default - no provided pull numbers, so will get number from context
     */
    readonly pullNumbers?: number[];
}
export declare class PullRequestLabelManager {
    private readonly client;
    private readonly owner;
    private readonly repo;
    private readonly pullNumbers;
    private readonly priorityLabels;
    private readonly classificationLabels;
    private readonly effortLabels;
    constructor(token: string, options: PullRequsetLabelManagerOptions);
    doPulls(): Promise<void>;
    copyLabelsFromReferencedIssues(pullNumber: number): Promise<void>;
    private findReferencedIssues;
    private issueLabels;
    /**
     * We mandate priority labels even if there are no priorities found in linked issues.
     * In the absence of a known priority, we will maintain priority that the PR was originally labeled.
     * In the absense of that, we will label the PR with the lowest priority available.
     */
    private highestPriorityLabel;
    private classification;
    private largestEffort;
}
