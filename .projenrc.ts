import { GitHubActionTypeScriptProject, RunsUsing } from 'projen-github-action-typescript';

const project = new GitHubActionTypeScriptProject({
  defaultReleaseBranch: 'main',
  release: false,
  name: 'pr-triage-manager',
  description: 'Triage PRs as they come in based on linked issues',
  repository: 'https://github.com/kaizen3031593/pr-triage-manager',
  projenrcTs: true,
  actionMetadata: {
    author: 'Kaizen Conroy',
    name: 'PR Auto Labeling',
    description: 'trigger an action based on PR description',
    runs: {
      main: 'dist/index.js',
      using: RunsUsing.NODE_20,
    },
    inputs: {
      'github-token': {
        description: 'GitHub token',
        required: true,
      },
      'priority-labels': {
        description: 'Priority Labels in a list from highest priority to lowest',
        required: false,
      },
      'classification-labels': {
        description: 'Classification Labels in a list from highest priority to lowest',
        required: false,
      },
      'on-pulls': {
        description: 'Run the triage manager on teh provided list of pulls',
        required: false,
      },
    },
    outputs: {
      labeled: {
        description: '"true" if labeled otherwise "false"',
      },
    },
  },
  deps: ['@actions/core', '@actions/github'],
  autoApproveUpgrades: true,
  autoApproveOptions: {
    allowedUsernames: ['cdklabs-automation'],
    secret: 'GITHUB_TOKEN',
  },
  devDeps: ['projen-github-action-typescript'],
  tsconfig: {
    compilerOptions: {
      target: 'ES2020',
      lib: ['es2020'], // allow Array.prototype.flat etc. and string.matchAll
    },
  },
});

project.synth();
