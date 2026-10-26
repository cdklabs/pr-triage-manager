import { javascript, typescript } from 'projen';

const project = new typescript.TypeScriptProject({
  name: 'pr-triage-manager',
  description: 'Triage PRs as they come in based on linked issues',
  repository: 'https://github.com/kaizen3031593/pr-triage-manager',
  authorName: 'Kaizen Conroy',

  projenrcTs: true,
  packageManager: javascript.NodePackageManager.YARN_BERRY,
  yarnBerryOptions: {
    yarnRcOptions: {
      nodeLinker: javascript.YarnNodeLinker.NODE_MODULES,
    },
  },
  githubOptions: {
    mergify: false,
    mergeQueue: true,
  },

  release: false,
  defaultReleaseBranch: 'main',

  deps: ['@actions/core', '@actions/github'],
  devDeps: ['@vercel/ncc'],
  autoApproveUpgrades: true,
  depsUpgradeOptions: {
    cooldown: 3,
  },

  autoApproveOptions: {
    allowedUsernames: ['cdklabs-automation'],
    secret: 'GITHUB_TOKEN',
  },

  tsconfig: {
    compilerOptions: {
      target: 'ES2020',
      lib: ['es2020'], // allow Array.prototype.flat etc. and string.matchAll
    },
  },
});

// The eslint task lints .projenrc.js, but with @typescript-eslint v8's project
// service enabled the JS file is not part of any tsconfig. Register it as an
// allowed default-project file so the project service can parse it.
project.eslint?.allowDefaultProjectFiles('.projenrc.js');

// package as a single runnable .js file in /dist
project.packageTask.reset('ncc build --source-map --license licenses.txt');
project.package.addField('main', 'lib/index.js');
project.addGitIgnore('!/dist/');
project.annotateGenerated('/dist/**');
project.synth();
