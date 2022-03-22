# PR Triage Manager Action

This action helps triage PRs that come into a repository by porting them over
from linked issues.

## Usage

You can use this action in a workflow like this:

```yaml
jobs:
  pr-triage-manager:
    permissions:
      pull-requests: write
    runs-on: ubuntu-latest
    steps:
      - uses: aws-github-ops/pr-triage-manager@main
        with:
          github-token: "${{ secrets.GITHUB_TOKEN }}"
```