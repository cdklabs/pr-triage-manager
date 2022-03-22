import * as core from '@actions/core';
import { PullRequestLabelManager } from './copy-issue-labels';

async function run() {
  core.setOutput('labeled', false.toString());

  const token = core.getInput('github-token');
  const priorityLabels: string[] | undefined = core
    .getInput('priority-labels', { required: false })
    .replace(/\[|\]/gi, '')
    .split('|');
  const classificationLabels: string[] | undefined = core
    .getInput('classification-labels', { required: false })
    .replace(/\[|\]/gi, '')
    .split('|');

  console.log('priority labels from inputs', priorityLabels);
  console.log('classification labesl from inputs', classificationLabels);
  const copier = new PullRequestLabelManager(token, {
    priorityLabels: priorityLabels,
    classificationLabels: classificationLabels,
  });
  await copier.copyLabelsFromReferencedIssues();
}

run().catch(error => {
  core.setFailed(error.message);
});
