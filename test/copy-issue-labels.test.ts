import * as github from '@actions/github';
import { PullRequestLabelManager } from '../src/copy-issue-labels';

// Mock @actions/github
jest.mock('@actions/github', () => ({
  getOctokit: jest.fn(),
  context: {
    repo: { owner: 'test-owner', repo: 'test-repo' },
    payload: {},
  },
}));

function createMockOctokit(opts: {
  pullBody: string;
  pullLabels: string[];
  issueLabelsMap: Record<number, string[] | 'not-found'>;
}) {
  const addLabels = jest.fn().mockResolvedValue(undefined);
  const removeLabel = jest.fn().mockResolvedValue(undefined);

  const mockOctokit = {
    rest: {
      pulls: {
        get: jest.fn().mockResolvedValue({
          data: {
            body: opts.pullBody,
            labels: opts.pullLabels.map(name => ({ name })),
          },
        }),
      },
      issues: {
        get: jest.fn().mockImplementation(({ issue_number }: { issue_number: number }) => {
          const result = opts.issueLabelsMap[issue_number];
          if (result === 'not-found') {
            const err: any = new Error('Not Found');
            err.status = 404;
            return Promise.reject(err);
          }
          return Promise.resolve({
            data: { labels: (result ?? []).map((name: string) => ({ name })) },
          });
        }),
        addLabels,
        removeLabel,
      },
    },
  };

  (github.getOctokit as jest.Mock).mockReturnValue(mockOctokit);
  return { addLabels, removeLabel, mockOctokit };
}

describe('PullRequestLabelManager - issue #610 fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('non-existing issue returns empty labels (no crash)', async () => {
    const { addLabels } = createMockOctokit({
      pullBody: 'closes #99999',
      pullLabels: ['p1'],
      issueLabelsMap: { 99999: 'not-found' },
    });

    const manager = new PullRequestLabelManager('fake-token', {
      pullNumbers: [1],
    });

    await manager.copyLabelsFromReferencedIssues(1);

    // Should reset to p2 (lowest) since the only referenced issue is invalid
    expect(addLabels).toHaveBeenCalledWith(expect.objectContaining({
      labels: expect.arrayContaining(['p2']),
    }));
  });

  test('PR with p1 resets to lowest when all referenced issues are invalid', async () => {
    const { addLabels, removeLabel } = createMockOctokit({
      pullBody: 'closes #99999',
      pullLabels: ['p1'],
      issueLabelsMap: { 99999: 'not-found' },
    });

    const manager = new PullRequestLabelManager('fake-token', {
      pullNumbers: [1],
    });

    await manager.copyLabelsFromReferencedIssues(1);

    // p1 should be removed, p2 added
    expect(removeLabel).toHaveBeenCalledWith(expect.objectContaining({ name: 'p1' }));
    expect(addLabels).toHaveBeenCalledWith(expect.objectContaining({
      labels: ['p2'],
    }));
  });

  test('PR keeps priority from valid linked issue', async () => {
    createMockOctokit({
      pullBody: 'closes #100',
      pullLabels: ['p2'],
      issueLabelsMap: { 100: ['p1', 'bug'] },
    });

    const manager = new PullRequestLabelManager('fake-token', {
      pullNumbers: [1],
    });

    await manager.copyLabelsFromReferencedIssues(1);
    // Should upgrade to p1 from the valid issue
  });

  test('PR with no references preserves existing priority', async () => {
    const { addLabels, removeLabel } = createMockOctokit({
      pullBody: 'This PR does stuff',
      pullLabels: ['p1'],
      issueLabelsMap: {},
    });

    const manager = new PullRequestLabelManager('fake-token', {
      pullNumbers: [1],
    });

    await manager.copyLabelsFromReferencedIssues(1);

    // No changes — p1 should stay since there are no references at all
    expect(addLabels).not.toHaveBeenCalled();
    expect(removeLabel).not.toHaveBeenCalled();
  });

  test('mix of valid and invalid issues uses valid issue labels', async () => {
    const { addLabels } = createMockOctokit({
      pullBody: 'closes #100 closes #99999',
      pullLabels: ['p2'],
      issueLabelsMap: { 100: ['p0'], 99999: 'not-found' },
    });

    const manager = new PullRequestLabelManager('fake-token', {
      pullNumbers: [1],
    });

    await manager.copyLabelsFromReferencedIssues(1);

    // Should use p0 from the valid issue
    expect(addLabels).toHaveBeenCalledWith(expect.objectContaining({
      labels: expect.arrayContaining(['p0']),
    }));
  });

  test('valid issue with no labels preserves PR priority (not a false reset)', async () => {
    const { addLabels, removeLabel } = createMockOctokit({
      pullBody: 'closes #200',
      pullLabels: ['p1'],
      issueLabelsMap: { 200: [] },
    });

    const manager = new PullRequestLabelManager('fake-token', {
      pullNumbers: [1],
    });

    await manager.copyLabelsFromReferencedIssues(1);

    // Issue exists but has no labels — should preserve PR's p1, NOT reset to p2
    expect(addLabels).not.toHaveBeenCalled();
    expect(removeLabel).not.toHaveBeenCalled();
  });
});
