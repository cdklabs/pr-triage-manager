import { getOctokit } from '@actions/github';

export interface CopyIssueLabelsOptions {
  readonly owner: string;
  readonly repo: string;
  readonly repoToken?: string;
  readonly dryRun?: boolean;
}

export class IssueLabelCopier {
  public static create(options: CopyIssueLabelsOptions) {
    if (!options.repoToken) {
      throw new Error('Requiring a repo token');
    }

    const client = getOctokit(options.repoToken, {});

    return new IssueLabelCopier(
      options.owner,
      options.repo,
      client,
      options.dryRun ?? false,
    );
  }

  public static async doIt(options: CopyIssueLabelsOptions) {
    const copyer = IssueLabelCopier.create(options);
    return copyer.copyAll();
  }

  constructor(
    private readonly owner: string,
    private readonly repo: string,
    private readonly client: ReturnType<typeof getOctokit>,
    private readonly dryRun: boolean,
  ) {}

  public async copyAll() {
    let page = 1;
    while (true) {
      const pulls = await this.client.rest.pulls.list({
        owner: this.owner,
        repo: this.repo,
        state: 'open',
        page,
      });
      if (pulls.data.length === 0) {
        break;
      }

      for (const pull of pulls.data) {
        await this.doPullRequest(pull.number);
      }

      page += 1;
    }
  }

  private async doPullRequest(pull_number: number) {
    const pull = await this.client.rest.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number,
    });
    const references = this.findReferencedIssues(pull.data.body ?? '');
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
    if (isEmptyDiff(diff)) { return; }

    const dryRun = this.dryRun ? '[--dry-run] ' : '';

    console.log(`${dryRun}${pull_number} (references ${references}) ${vizDiff(diff)}`);
    if (!this.dryRun) {
      await Promise.all([
        diff.adds ? this.client.rest.issues.addLabels({
          owner: this.owner,
          repo: this.repo,
          issue_number: pull_number,
          labels: diff.adds,
        }) : Promise.resolve(undefined),
        diff.removes ? this.client.rest.issues.removeAllLabels({
          owner: this.owner,
          repo: this.repo,
          issue_number: pull_number,
          labels: diff.adds,
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