const { typescript } = require('projen');

const project = new typescript.TypeScriptProject({
  defaultReleaseBranch: 'main',
  name: 'pr-triage-manager',
  description: 'Triage PRs as they come in based on linked issues',
  repository: 'https://github.com/kaizen3031593/pr-triage-manager',
  authorName: 'Kaizen Conroy',
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
