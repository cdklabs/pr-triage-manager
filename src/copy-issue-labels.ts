import * as core from '@actions/core';
import * as github from '@actions/github';

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
   * @default false
   */
  readonly dryRun?: boolean;
}

export class PullRequestLabelManager {
  private readonly client: ReturnType<typeof github.getOctokit>;
  private readonly owner: string;
  private readonly repo: string;
  private readonly pullNumber: number | undefined;
  private readonly priorityLabels: string[];
  private readonly classificationLabels: string[];
  private readonly effortLabels: string[];
  private readonly dryRun: boolean;

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
    this.dryRun = options.dryRun ?? false;

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
    replaceLabels(newPullLabels, this.priorityLabels, this.highestPrioLabel(issueLabels));
    replaceLabels(newPullLabels, this.classificationLabels, this.classification(issueLabels));
    replaceLabels(newPullLabels, this.effortLabels, this.effort(issueLabels));

    const diff = setDiff(pullLabels, newPullLabels);
    console.log('Adding these labels: ', diff.adds);
    console.log('Removing these labels', diff.removes);

    if (isEmptyDiff(diff)) { return; }

    const dryRun = this.dryRun ? '[--dry-run] ' : '';

    console.log(`${dryRun}${this.pullNumber} (references ${references}) ${vizDiff(diff)}`);
    if (!this.dryRun) {
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
  }

  private findReferencedIssues(text: string): number[] {
    const hashRegex = /#(\d+)/g;
    const urlRegex = new RegExp(`https://github.com/${this.owner}/${this.repo}/issues/(\d+)`, 'g');

    const issuesReffedByHash = Array.from(text.matchAll(hashRegex)).map((m) => m[1]);
    const issuesReffedByUrl = Array.from(text.matchAll(urlRegex)).map((m) => m[1]);

    return [...issuesReffedByHash, ...issuesReffedByUrl].map((x) => parseInt(x, 10));
  }

  private async issueLabels(issue_number: number): Promise<string[]> {
    const issue = await this.client.rest.issues.get({
      owner: this.owner,
      repo: this.repo,
      issue_number,
    });
    return issue.data.labels.map((l) => typeof l === 'string' ? l : l.name ?? '');
  }

  private highestPrioLabel(labels: Set<string>) {
    return this.priorityLabels.find(l => labels.has(l));
  }

  private classification(labels: Set<string>) {
    return this.classificationLabels.find(l => labels.has(l));
  }

  private effort(labels: Set<string>) {
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