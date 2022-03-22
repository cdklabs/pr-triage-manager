import { context } from '@actions/github';
import { IssueLabelCopier } from './copy-issue-labels';

export async function copyIssueLabelsAction() {
  await IssueLabelCopier.doIt({
    owner: context.repo.owner,
    repo: context.repo.repo,
  });
}

copyIssueLabelsAction().catch(e => {
  console.error(e);
  process.exitCode = 1;
});