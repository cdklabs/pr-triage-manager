# PR Triage Manager Action

This action helps triage PRs that come into a repository by porting them over
from linked issues.

> This action copies from linked issues that will be closed by merging the PR.
> That means it filters for issues linked as `closes #0`, `fixes #0`, or any of
> the other options listed
> [here.](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue#linking-a-pull-request-to-an-issue-using-a-keyword)

## Usage

You can use this action in a workflow like this:

```yaml
jobs:
  pr-triage-manager:
    permissions:
      pull-requests: write
    runs-on: ubuntu-latest
    steps:
      - uses: kaizen3031593/pr-triage-manager@main
        with:
          github-token: "${{ secrets.GITHUB_TOKEN }}"
```

This assumes that your repository has the following labeling conventions:

- priority: `p0`, `p1`, `p2`
- classification: `bug`, `feature-request`
- effort: `effort-small`, `effort-medium`, `effort-large`

If you want to configure your labeling conventions differently, pass them along in the job:

```yaml
jobs:
  pr-triage-manager:
    permissions:
      pull-requests: write
    runs-on: ubuntu-latest
    steps:
      - uses: kaizen3013593/pr-triage-manager@main
        with:
          github-token: "${{ secrets.GITHUB_TOKEN }}"
          effort-labels: "[xs,s,m,l,xl]"
          priority: "[important,nice-to-have]"
```

## Result

For example, say you have a PR with the following description:

```
This PR closes #12345 by introducing a new property, X.
Related #67890 (a similar issue not addressed in this PR).
```

When this action runs, it will find linked issues _that the PR will close_. In the above example,
the action will find `#12345` and will ignore `#67890`. It will then find any relevant priority,
effort, and classification labels in the linked issue and copy them to the PR.

If the linked issue does not have a relevant priority, the PR priority will be set to the lowest
priority available.
