const { typescript } = require('projen');

const project = new typescript.TypeScriptProject({
  defaultReleaseBranch: 'main',
  name: 'github-backlog-groomer',
  description: 'Helpers for keeping the backlog of GitHub work manageable',
  repository: 'https://github.com/rix0rrr/github-backlog-groomer',
  authorName: 'Rico Huijbers',

  bin: {
    'copy-issue-labels-action': 'bin/copy-issue-labels-action',
    'copy-issue-labels-cli': 'bin/copy-issue-labels-cli',
  },

  deps: ['@actions/core', '@actions/github', 'yargs'],
  devDeps: [],
  releaseToNpm: true,
  tsconfig: {
    compilerOptions: {
      target: 'ES2020',
      lib: ['es2020'], // allow Array.prototype.flat etc. and string.matchAll
    },
  },
});
project.synth();
