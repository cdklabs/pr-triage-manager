import * as yargs from 'yargs';
import { IssueLabelCopier } from './copy-issue-labels';

export async function copyIssueLabelsCli() {
  const args = await yargs
    .usage('$0')
    .option('token', {
      alias: 't',
      type: 'string',
      describe: 'GitHub token',
      requiresArg: true,
      demandOption: true,
    })
    .option('repo', {
      alias: 'r',
      type: 'string',
      describe: 'Repository to operate on',
      requiresArg: true,
      demandOption: true,
    })
    .option('dry-run', {
      alias: 'd',
      type: 'boolean',
      describe: 'Do not actually update tags but print output',
      default: false,
    })
    .help()
    .strictOptions()
    .showHelpOnFail(false).argv;

  const [owner, repo] = args.repo.split('/');
  if (!repo) {
    throw new Error(`Repo must be informat OWNER/REPO, got: ${args.repo}`);
  }

  await IssueLabelCopier.doIt({
    owner,
    repo,
    repoToken: args.token,
    dryRun: args['dry-run'],
  });
}

copyIssueLabelsCli().catch(e => {
  console.error(e);
  process.exitCode = 1;
});