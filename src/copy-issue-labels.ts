import * as core from '@actions/core';
import * as github from '@actions/github';

// see: https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue#linking-a-pull-request-to-an-issue-using-a-keyword
const GITHUB_CLOSE_ISSUE_KEYWORDS = [
  'close',
  'closes',
  'closed',
  'fix',
  'fixes',
  'fixed',
  'resolve',
  'resolves',
  'resolved',
];

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

export class PullRequestLabelManager {
  private readonly client: ReturnType<typeof github.getOctokit>;
  private readonly owner: string;
  private readonly repo: string;
  private readonly pullNumber: number | undefined;
  private readonly priorityLabels: string[];
  private readonly classificationLabels: string[];
  private readonly effortLabels: string[];

  constructor(
    token: string,
    options: PullRequsetLabelManagerOptions,
  ) {
    this.client = github.getOctokit(token);
    this.repo = github.context.repo.repo;
    this.owner = github.context.repo.owner;
    this.priorityLabels = options.priorityLabels ?? ['p0', 'p1', 'p2'];
    this.classificationLabels = options.classificationLabels ?? ['bug', 'feature-request'];
    this.effortLabels = options.effortLabels ?? ['effort-large', 'effort-medium', 'effort-small'];

    if (github.context.payload.pull_request) {
      this.pullNumber = github.context.payload.pull_request.number;
    } else {
      core.setFailed('Error retrieving PR');
    }
  }

  public async copyLabelsFromReferencedIssues() {
    console.log('Adding labels to PR number ', this.pullNumber);
    if (!this.pullNumber) {
      return;
    }

    const pull = await this.client.rest.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: this.pullNumber,
    });

    const references = this.findReferencedIssues(pull.data.body ?? '');
    console.log('Found these referenced issues: ', references);

    const pullLabels = new Set(pull.data.labels.map((l) => l.name ?? ''));
    const issueLabels = new Set(
      (
        await Promise.all(references.map((issue) => this.issueLabels(issue)))
      ).flat(),
    );

    const newPullLabels = new Set(pullLabels);
    replaceLabels(newPullLabels, this.priorityLabels, this.highestPriorityLabel(issueLabels));
    replaceLabels(newPullLabels, this.classificationLabels, this.classification(issueLabels));
    replaceLabels(newPullLabels, this.effortLabels, this.largestEffort(issueLabels));

    const diff = setDiff(pullLabels, newPullLabels);
    console.log('Adding these labels: ', diff.adds);
    console.log('Removing these labels', diff.removes);

    if (isEmptyDiff(diff)) { return; }

    console.log(`${this.pullNumber} (references ${references}) ${vizDiff(diff)}`);
    await Promise.all([
      diff.adds ? this.client.rest.issues.addLabels({
        owner: this.owner,
        repo: this.repo,
        issue_number: this.pullNumber,
        labels: diff.adds,
      }) : Promise.resolve(undefined),
      diff.removes ? diff.removes.forEach((label) => this.client.rest.issues.removeLabel({
        owner: this.owner,
        repo: this.repo,
        issue_number: this.pullNumber!,
        name: label,
      })) : Promise.resolve(undefined),
    ]);
  }

  private findReferencedIssues(text: string): number[] {
    const hashRegex = /(\w+) #(\d+)/g;
    const urlRegex = new RegExp(`(\w+) https://github.com/${this.owner}/${this.repo}/issues/(\d+)`, 'g');

    console.log(urlRegex);
    const issuesClosedByHash =issuesClosed(hashRegex);
    const issuesClosedByUrl = issuesClosed(urlRegex);
    console.log(text.matchAll(urlRegex));
    console.log(issuesClosedByUrl);
    return [...issuesClosedByHash, ...issuesClosedByUrl].map((x) => parseInt(x, 10));

    function issuesClosed(regex: RegExp): string[] {
      return Array.from(text.matchAll(regex))
        .filter((m) => GITHUB_CLOSE_ISSUE_KEYWORDS.includes(m[1].toLowerCase()))
        .map((m) => m[2]);
    }
  }

  private async issueLabels(issue_number: number): Promise<string[]> {
    const issue = await this.client.rest.issues.get({
      owner: this.owner,
      repo: this.repo,
      issue_number,
    });
    return issue.data.labels.map((l) => typeof l === 'string' ? l : l.name ?? '');
  }

  /**
   * We mandate priority labels even if there are no priorities found in linked issues.
   * In the absence of a known priority, we will label the PR with the lowest priority available.
   */
  private highestPriorityLabel(labels: Set<string>): string {
    return this.priorityLabels.find(l => labels.has(l)) ?? this.priorityLabels[this.priorityLabels.length-1];
  }

  private classification(labels: Set<string>) {
    return this.classificationLabels.find(l => labels.has(l));
  }

  private largestEffort(labels: Set<string>) {
    return this.effortLabels.find(l => labels.has(l));
  }
}

function replaceLabels(labels: Set<string>, remove: string[], replace: string | undefined) {
  if (replace !== undefined) {
    for (const r of remove) { labels.delete(r); }
    labels.add(replace);
  }
}

interface SetDiff {
  readonly adds: string[];
  readonly removes: string[];
}

function setDiff(xs: Set<string>, ys: Set<string>): SetDiff {
  const ret: SetDiff = { adds: [], removes: [] };
  for (const y of ys) {
    if (!xs.has(y)) {
      ret.adds.push(y);
    }
  }

  for (const x of xs) {
    if (!ys.has(x)) {
      ret.removes.push(x);
    }
  }

  return ret;
}

function isEmptyDiff(diff: SetDiff) {
  return diff.adds.length + diff.removes.length === 0;
}

function vizDiff(diff: SetDiff): string {
  return `${JSON.stringify(diff.removes)} -> ${JSON.stringify(diff.adds)}`;
}