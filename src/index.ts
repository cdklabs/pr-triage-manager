import * as core from '@actions/core';
import { PullRequestLabelManager } from './copy-issue-labels';

async function run() {
  core.setOutput('labeled', false.toString());

  const token = core.getInput('github-token');
  const rawPriorityLabels: string = core.getInput('priority-labels');
  const rawClassificationLables: string = core.getInput('classification-labels');
  const rawEffortLabels: string = core.getInput('effort-labels');

  console.log('priority labels from inputs', rawPriorityLabels);
  console.log('classification labesl from inputs', rawClassificationLables);
  const copier = new PullRequestLabelManager(token, {
    priorityLabels: renderListInput(rawPriorityLabels),
    classificationLabels: renderListInput(rawClassificationLables),
    effortLabels: renderListInput(rawEffortLabels),
  });
  await copier.copyLabelsFromReferencedIssues();
  core.setOutput('labeled', true.toString());
}

/**
 * Renders a TypeScript list based on what we expect the list to look like in yaml.
 * We expect to see something like "[item1|item2]". GitHub will return '' if the
 * input is not defined, so treating the empty string like undefined.
 */
function renderListInput(rawInput: string): string[] | undefined {
  return rawInput === '' ? undefined : rawInput.replace(/\[|\]/gi, '').split('|');
}

run().catch(error => {
  core.setFailed(error.message);
});
