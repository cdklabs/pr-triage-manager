import * as core from '@actions/core';
import * as github from '@actions/github';

export class PullRequestLabelManager {
  private readonly client: ReturnType<typeof github.getOctokit>;
  private readonly owner: string;
  private readonly repo: string;
  private readonly pullNumber: number | undefined;

  constructor(
    token: string,
    private readonly dryRun: boolean = false,
  ) {
    this.client = github.getOctokit(token);
    this.repo = github.context.repo.repo;
    this.owner = github.context.repo.owner;

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
    replaceLabels(newPullLabels, PRIO_LABELS, highestPrioLabel(issueLabels));
    replaceLabels(newPullLabels, CLASS_LABELS, classification(issueLabels));

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
        diff.removes ? this.client.rest.issues.removeAllLabels({
          owner: this.owner,
          repo: this.repo,
          issue_number: this.pullNumber,
          labels: diff.removes,
        }) : Promise.resolve(undefined),
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
}

const PRIO_LABELS = ['p0', 'p1', 'p2'];
const CLASS_LABELS = ['bug', 'feature-request'];

function highestPrioLabel(labels: Set<string>) {
  return PRIO_LABELS.find(l => labels.has(l));
}

function classification(labels: Set<string>) {
  return CLASS_LABELS.find(l => labels.has(l));
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