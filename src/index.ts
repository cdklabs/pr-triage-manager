import * as core from '@actions/core';
import { PullRequestLabelManager } from './copy-issue-labels';

async function run() {
  core.setOutput('labeled', false.toString());

  const token = core.getInput('github-token');
  const copier = new PullRequestLabelManager(token);
  await copier.copyLabelsFromReferencedIssues();
}

run().catch(error => {
  core.setFailed(error.message);
});
