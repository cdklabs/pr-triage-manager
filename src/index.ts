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
  console.log(core.getInput('on-pulls'), renderListInput(core.getInput('on-pulls')));
  console.log('pull numbers', toNumber(renderListInput(core.getInput('on-pulls')) ?? []));

  const copier = new PullRequestLabelManager(token, {
    priorityLabels: renderListInput(rawPriorityLabels),
    classificationLabels: renderListInput(rawClassificationLables),
    effortLabels: renderListInput(rawEffortLabels),
    pullNumbers: toNumber(renderListInput(core.getInput('on-pulls')) ?? []),
  });

  await copier.doPulls();
  core.setOutput('labeled', true.toString());
}

/**
 * Renders a TypeScript list based on what we expect the list to look like in yaml.
 * We expect to see something like "[item1|item2]". GitHub will return '' if the
 * input is not defined, so treating the empty string like undefined.
 */
function renderListInput(rawInput: string): string[] | undefined {
  rawInput.replace(',', '|');
  return rawInput === '' ? undefined : rawInput.replace(/\[|\]/gi, '').split('|');
}

function toNumber(list: string[]): number[] {
  return list.map((i) => Number(i));
}

run().catch(error => {
  core.setFailed(error.message);
});
