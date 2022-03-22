const { typescript } = require('projen');

const project = new typescript.TypeScriptProject({
  defaultReleaseBranch: 'main',
  name: 'pr-triage-manager',
  description: 'Triage PRs as they come in based on linked issues',
  repository: 'https://github.com/kaizen3031593/pr-triage-manager',
  authorName: 'Kaizen Conroy',
  deps: ['@actions/core', '@actions/github'],
  devDeps: ['@vercel/ncc'],
  releaseToNpm: true,
  tsconfig: {
    compilerOptions: {
      target: 'ES2020',
      lib: ['es2020'], // allow Array.prototype.flat etc. and string.matchAll
    },
  },
});

// package as a single runnable .js file in /dist
project.packageTask.reset('ncc build --source-map --license licenses.txt');
project.package.addField('main', 'lib/index.js');
project.addGitIgnore('!/dist/');
project.annotateGenerated('/dist/**');
project.synth();
