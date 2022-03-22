import * as core from '@actions/core';
import { IssueLabelCopier } from './copy-issue-labels';

async function run() {
  core.setOutput('labeled', false.toString());

  const token = core.getInput('github-token');
  const copier = new IssueLabelCopier(token);
  await copier.doPullRequest();
}

run().catch(error => {
  core.setFailed(error.message);
});