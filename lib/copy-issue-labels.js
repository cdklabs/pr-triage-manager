"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullRequestLabelManager = void 0;
const github = __importStar(require("@actions/github"));
// see: https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue#linking-a-pull-request-to-an-issue-using-a-keyword
const GITHUB_CLOSE_ISSUE_KEYWORDS = [
    'close',
    'closes',
    'closed',
    'fix',
    'fixes',
    'fixed',
    'resolve',
    'resolves',
    'resolved',
];
class PullRequestLabelManager {
    constructor(token, options) {
        this.client = github.getOctokit(token);
        this.repo = github.context.repo.repo;
        this.owner = github.context.repo.owner;
        this.priorityLabels = options.priorityLabels ?? ['p0', 'p1', 'p2'];
        this.classificationLabels = options.classificationLabels ?? ['bug', 'feature-request'];
        this.effortLabels = options.effortLabels ?? ['effort/large', 'effort/medium', 'effort/small'];
        // If pull numbers are supplied, we will try to copy labels to each
        // If pull numbers are not supplied, we will find the pull request that triggered the action
        // and copy labels on that pull request.
        this.pullNumbers = (options.pullNumbers && options.pullNumbers.length > 0) ?
            options.pullNumbers :
            [];
        if (github.context.payload.pull_request) {
            this.pullNumbers.push(github.context.payload.pull_request.number);
        }
    }
    async doPulls() {
        for (const pull of this.pullNumbers) {
            await this.copyLabelsFromReferencedIssues(pull);
        }
    }
    async copyLabelsFromReferencedIssues(pullNumber) {
        console.log('Adding labels to PR number ', pullNumber);
        const pull = await this.client.rest.pulls.get({
            owner: this.owner,
            repo: this.repo,
            pull_number: pullNumber,
        });
        const references = this.findReferencedIssues(pull.data.body ?? '');
        console.log('Found these referenced issues: ', references);
        const pullLabels = new Set(pull.data.labels.map((l) => l.name ?? ''));
        const issueLabels = new Set((await Promise.all(references.map((issue) => this.issueLabels(issue)))).flat());
        const newPullLabels = new Set(pullLabels);
        replaceLabels(newPullLabels, this.priorityLabels, this.highestPriorityLabel(issueLabels, pullLabels));
        replaceLabels(newPullLabels, this.classificationLabels, this.classification(issueLabels));
        replaceLabels(newPullLabels, this.effortLabels, this.largestEffort(issueLabels));
        const diff = setDiff(pullLabels, newPullLabels);
        console.log('Adding these labels: ', diff.adds);
        console.log('Removing these labels', diff.removes);
        if (isEmptyDiff(diff)) {
            return;
        }
        console.log(`${pullNumber} (references ${references}) ${vizDiff(diff)}`);
        await Promise.all([
            diff.adds ? this.client.rest.issues.addLabels({
                owner: this.owner,
                repo: this.repo,
                issue_number: pullNumber,
                labels: diff.adds,
            }) : Promise.resolve(undefined),
            diff.removes ? diff.removes.forEach((label) => this.client.rest.issues.removeLabel({
                owner: this.owner,
                repo: this.repo,
                issue_number: pullNumber,
                name: label,
            })) : Promise.resolve(undefined),
        ]);
    }
    findReferencedIssues(text) {
        const hashRegex = /(\w+) #(\d+)/g;
        const urlRegex = new RegExp(`(\\w+) https://github.com/${this.owner}/${this.repo}/issues/(\\d+)`, 'g');
        const issuesClosedByHash = issuesClosed(hashRegex);
        const issuesClosedByUrl = issuesClosed(urlRegex);
        return [...issuesClosedByHash, ...issuesClosedByUrl].map((x) => parseInt(x, 10));
        function issuesClosed(regex) {
            return Array.from(text.matchAll(regex))
                .filter((m) => GITHUB_CLOSE_ISSUE_KEYWORDS.includes(m[1].toLowerCase()))
                .map((m) => m[2]);
        }
    }
    async issueLabels(issue_number) {
        const issue = await this.client.rest.issues.get({
            owner: this.owner,
            repo: this.repo,
            issue_number,
        });
        return issue.data.labels.map((l) => typeof l === 'string' ? l : l.name ?? '');
    }
    /**
     * We mandate priority labels even if there are no priorities found in linked issues.
     * In the absence of a known priority, we will maintain priority that the PR was originally labeled.
     * In the absense of that, we will label the PR with the lowest priority available.
     */
    highestPriorityLabel(issueLabels, pullLabels) {
        return this.priorityLabels.find(l => issueLabels.has(l)) ??
            this.priorityLabels.find(l => pullLabels.has(l)) ??
            this.priorityLabels[this.priorityLabels.length - 1];
    }
    classification(labels) {
        return this.classificationLabels.find(l => labels.has(l));
    }
    largestEffort(labels) {
        return this.effortLabels.find(l => labels.has(l));
    }
}
exports.PullRequestLabelManager = PullRequestLabelManager;
function replaceLabels(labels, remove, replace) {
    if (replace !== undefined) {
        for (const r of remove) {
            labels.delete(r);
        }
        labels.add(replace);
    }
}
function setDiff(xs, ys) {
    const ret = { adds: [], removes: [] };
    for (const y of ys) {
        if (!xs.has(y)) {
            ret.adds.push(y);
        }
    }
    for (const x of xs) {
        if (!ys.has(x)) {
            ret.removes.push(x);
        }
    }
    return ret;
}
function isEmptyDiff(diff) {
    return diff.adds.length + diff.removes.length === 0;
}
function vizDiff(diff) {
    return `${JSON.stringify(diff.removes)} -> ${JSON.stringify(diff.adds)}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29weS1pc3N1ZS1sYWJlbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvY29weS1pc3N1ZS1sYWJlbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdEQUEwQztBQUUxQyw4SkFBOEo7QUFDOUosTUFBTSwyQkFBMkIsR0FBRztJQUNsQyxPQUFPO0lBQ1AsUUFBUTtJQUNSLFFBQVE7SUFDUixLQUFLO0lBQ0wsT0FBTztJQUNQLE9BQU87SUFDUCxTQUFTO0lBQ1QsVUFBVTtJQUNWLFVBQVU7Q0FDWCxDQUFDO0FBd0JGLE1BQWEsdUJBQXVCO0lBU2xDLFlBQ0UsS0FBYSxFQUNiLE9BQXVDO1FBRXZDLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QyxJQUFJLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztRQUNyQyxJQUFJLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUN2QyxJQUFJLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQyxjQUFjLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25FLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxPQUFPLENBQUMsb0JBQW9CLElBQUksQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUN2RixJQUFJLENBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQyxZQUFZLElBQUksQ0FBQyxjQUFjLEVBQUUsZUFBZSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRTlGLG1FQUFtRTtRQUNuRSw0RkFBNEY7UUFDNUYsd0NBQXdDO1FBQ3hDLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxPQUFPLENBQUMsV0FBVyxJQUFJLE9BQU8sQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUUsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3JCLEVBQUUsQ0FBQztRQUVMLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFO1lBQ3ZDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNuRTtJQUNILENBQUM7SUFFTSxLQUFLLENBQUMsT0FBTztRQUNsQixLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDbkMsTUFBTSxJQUFJLENBQUMsOEJBQThCLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDakQ7SUFDSCxDQUFDO0lBRU0sS0FBSyxDQUFDLDhCQUE4QixDQUFDLFVBQWtCO1FBQzVELE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFdkQsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO1lBQzVDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztZQUNqQixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixXQUFXLEVBQUUsVUFBVTtTQUN4QixDQUFDLENBQUM7UUFFSCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUM7UUFDbkUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQ0FBaUMsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUUzRCxNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0RSxNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsQ0FDekIsQ0FDRSxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQ3RFLENBQUMsSUFBSSxFQUFFLENBQ1QsQ0FBQztRQUVGLE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDdEcsYUFBYSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQzFGLGFBQWEsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFFakYsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFVBQVUsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUNoRCxPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoRCxPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVuRCxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUFFLE9BQU87U0FBRTtRQUVsQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsVUFBVSxnQkFBZ0IsVUFBVSxLQUFLLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDekUsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQ2hCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7Z0JBQzVDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztnQkFDakIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO2dCQUNmLFlBQVksRUFBRSxVQUFVO2dCQUN4QixNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUk7YUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztZQUMvQixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQztnQkFDakYsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO2dCQUNqQixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7Z0JBQ2YsWUFBWSxFQUFFLFVBQVc7Z0JBQ3pCLElBQUksRUFBRSxLQUFLO2FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO1NBQ2pDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxJQUFZO1FBQ3ZDLE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBQztRQUNsQyxNQUFNLFFBQVEsR0FBRyxJQUFJLE1BQU0sQ0FBQyw2QkFBNkIsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSSxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUV2RyxNQUFNLGtCQUFrQixHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNuRCxNQUFNLGlCQUFpQixHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVqRCxPQUFPLENBQUMsR0FBRyxrQkFBa0IsRUFBRSxHQUFHLGlCQUFpQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFakYsU0FBUyxZQUFZLENBQUMsS0FBYTtZQUNqQyxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztpQkFDcEMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7aUJBQ3ZFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEIsQ0FBQztJQUNILENBQUM7SUFFTyxLQUFLLENBQUMsV0FBVyxDQUFDLFlBQW9CO1FBQzVDLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztZQUM5QyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDakIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1lBQ2YsWUFBWTtTQUNiLENBQUMsQ0FBQztRQUNILE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQztJQUNoRixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNLLG9CQUFvQixDQUFDLFdBQXdCLEVBQUUsVUFBdUI7UUFDNUUsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdEQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hELElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVPLGNBQWMsQ0FBQyxNQUFtQjtRQUN4QyxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUVPLGFBQWEsQ0FBQyxNQUFtQjtRQUN2QyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BELENBQUM7Q0FDRjtBQWhJRCwwREFnSUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxNQUFtQixFQUFFLE1BQWdCLEVBQUUsT0FBMkI7SUFDdkYsSUFBSSxPQUFPLEtBQUssU0FBUyxFQUFFO1FBQ3pCLEtBQUssTUFBTSxDQUFDLElBQUksTUFBTSxFQUFFO1lBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUFFO1FBQzdDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7S0FDckI7QUFDSCxDQUFDO0FBT0QsU0FBUyxPQUFPLENBQUMsRUFBZSxFQUFFLEVBQWU7SUFDL0MsTUFBTSxHQUFHLEdBQVksRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQztJQUMvQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUNsQixJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNkLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2xCO0tBQ0Y7SUFFRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUNsQixJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNkLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3JCO0tBQ0Y7SUFFRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxJQUFhO0lBQ2hDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDO0FBQ3RELENBQUM7QUFFRCxTQUFTLE9BQU8sQ0FBQyxJQUFhO0lBQzVCLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO0FBQzNFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBnaXRodWIgZnJvbSAnQGFjdGlvbnMvZ2l0aHViJztcblxuLy8gc2VlOiBodHRwczovL2RvY3MuZ2l0aHViLmNvbS9lbi9pc3N1ZXMvdHJhY2tpbmcteW91ci13b3JrLXdpdGgtaXNzdWVzL2xpbmtpbmctYS1wdWxsLXJlcXVlc3QtdG8tYW4taXNzdWUjbGlua2luZy1hLXB1bGwtcmVxdWVzdC10by1hbi1pc3N1ZS11c2luZy1hLWtleXdvcmRcbmNvbnN0IEdJVEhVQl9DTE9TRV9JU1NVRV9LRVlXT1JEUyA9IFtcbiAgJ2Nsb3NlJyxcbiAgJ2Nsb3NlcycsXG4gICdjbG9zZWQnLFxuICAnZml4JyxcbiAgJ2ZpeGVzJyxcbiAgJ2ZpeGVkJyxcbiAgJ3Jlc29sdmUnLFxuICAncmVzb2x2ZXMnLFxuICAncmVzb2x2ZWQnLFxuXTtcblxuZXhwb3J0IGludGVyZmFjZSBQdWxsUmVxdXNldExhYmVsTWFuYWdlck9wdGlvbnMge1xuICAvKipcbiAgICogQGRlZmF1bHQgLSBbJ3AwJywgJ3AxJywgJ3AyJ11cbiAgICovXG4gIHJlYWRvbmx5IHByaW9yaXR5TGFiZWxzPzogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIEBkZWZhdWx0IC0gWydidWcnLCAnZmVhdHVyZS1yZXF1ZXN0J11cbiAgICovXG4gIHJlYWRvbmx5IGNsYXNzaWZpY2F0aW9uTGFiZWxzPzogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIEBkZWZhdWx0IC0gWydlZmZvcnQtbGFyZ2UnLCAnZWZmb3J0LW1lZGl1bScsICdlZmZvcnQtc21hbGwnXVxuICAgKi9cbiAgcmVhZG9ubHkgZWZmb3J0TGFiZWxzPzogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIEBkZWZhdWx0IC0gbm8gcHJvdmlkZWQgcHVsbCBudW1iZXJzLCBzbyB3aWxsIGdldCBudW1iZXIgZnJvbSBjb250ZXh0XG4gICAqL1xuICByZWFkb25seSBwdWxsTnVtYmVycz86IG51bWJlcltdO1xufVxuXG5leHBvcnQgY2xhc3MgUHVsbFJlcXVlc3RMYWJlbE1hbmFnZXIge1xuICBwcml2YXRlIHJlYWRvbmx5IGNsaWVudDogUmV0dXJuVHlwZTx0eXBlb2YgZ2l0aHViLmdldE9jdG9raXQ+O1xuICBwcml2YXRlIHJlYWRvbmx5IG93bmVyOiBzdHJpbmc7XG4gIHByaXZhdGUgcmVhZG9ubHkgcmVwbzogc3RyaW5nO1xuICBwcml2YXRlIHJlYWRvbmx5IHB1bGxOdW1iZXJzOiBudW1iZXJbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBwcmlvcml0eUxhYmVsczogc3RyaW5nW107XG4gIHByaXZhdGUgcmVhZG9ubHkgY2xhc3NpZmljYXRpb25MYWJlbHM6IHN0cmluZ1tdO1xuICBwcml2YXRlIHJlYWRvbmx5IGVmZm9ydExhYmVsczogc3RyaW5nW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgdG9rZW46IHN0cmluZyxcbiAgICBvcHRpb25zOiBQdWxsUmVxdXNldExhYmVsTWFuYWdlck9wdGlvbnMsXG4gICkge1xuICAgIHRoaXMuY2xpZW50ID0gZ2l0aHViLmdldE9jdG9raXQodG9rZW4pO1xuICAgIHRoaXMucmVwbyA9IGdpdGh1Yi5jb250ZXh0LnJlcG8ucmVwbztcbiAgICB0aGlzLm93bmVyID0gZ2l0aHViLmNvbnRleHQucmVwby5vd25lcjtcbiAgICB0aGlzLnByaW9yaXR5TGFiZWxzID0gb3B0aW9ucy5wcmlvcml0eUxhYmVscyA/PyBbJ3AwJywgJ3AxJywgJ3AyJ107XG4gICAgdGhpcy5jbGFzc2lmaWNhdGlvbkxhYmVscyA9IG9wdGlvbnMuY2xhc3NpZmljYXRpb25MYWJlbHMgPz8gWydidWcnLCAnZmVhdHVyZS1yZXF1ZXN0J107XG4gICAgdGhpcy5lZmZvcnRMYWJlbHMgPSBvcHRpb25zLmVmZm9ydExhYmVscyA/PyBbJ2VmZm9ydC9sYXJnZScsICdlZmZvcnQvbWVkaXVtJywgJ2VmZm9ydC9zbWFsbCddO1xuXG4gICAgLy8gSWYgcHVsbCBudW1iZXJzIGFyZSBzdXBwbGllZCwgd2Ugd2lsbCB0cnkgdG8gY29weSBsYWJlbHMgdG8gZWFjaFxuICAgIC8vIElmIHB1bGwgbnVtYmVycyBhcmUgbm90IHN1cHBsaWVkLCB3ZSB3aWxsIGZpbmQgdGhlIHB1bGwgcmVxdWVzdCB0aGF0IHRyaWdnZXJlZCB0aGUgYWN0aW9uXG4gICAgLy8gYW5kIGNvcHkgbGFiZWxzIG9uIHRoYXQgcHVsbCByZXF1ZXN0LlxuICAgIHRoaXMucHVsbE51bWJlcnMgPSAob3B0aW9ucy5wdWxsTnVtYmVycyAmJiBvcHRpb25zLnB1bGxOdW1iZXJzLmxlbmd0aCA+IDApID9cbiAgICAgIG9wdGlvbnMucHVsbE51bWJlcnMgOlxuICAgICAgW107XG5cbiAgICBpZiAoZ2l0aHViLmNvbnRleHQucGF5bG9hZC5wdWxsX3JlcXVlc3QpIHtcbiAgICAgIHRoaXMucHVsbE51bWJlcnMucHVzaChnaXRodWIuY29udGV4dC5wYXlsb2FkLnB1bGxfcmVxdWVzdC5udW1iZXIpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBkb1B1bGxzKCkge1xuICAgIGZvciAoY29uc3QgcHVsbCBvZiB0aGlzLnB1bGxOdW1iZXJzKSB7XG4gICAgICBhd2FpdCB0aGlzLmNvcHlMYWJlbHNGcm9tUmVmZXJlbmNlZElzc3VlcyhwdWxsKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgY29weUxhYmVsc0Zyb21SZWZlcmVuY2VkSXNzdWVzKHB1bGxOdW1iZXI6IG51bWJlcikge1xuICAgIGNvbnNvbGUubG9nKCdBZGRpbmcgbGFiZWxzIHRvIFBSIG51bWJlciAnLCBwdWxsTnVtYmVyKTtcblxuICAgIGNvbnN0IHB1bGwgPSBhd2FpdCB0aGlzLmNsaWVudC5yZXN0LnB1bGxzLmdldCh7XG4gICAgICBvd25lcjogdGhpcy5vd25lcixcbiAgICAgIHJlcG86IHRoaXMucmVwbyxcbiAgICAgIHB1bGxfbnVtYmVyOiBwdWxsTnVtYmVyLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcmVmZXJlbmNlcyA9IHRoaXMuZmluZFJlZmVyZW5jZWRJc3N1ZXMocHVsbC5kYXRhLmJvZHkgPz8gJycpO1xuICAgIGNvbnNvbGUubG9nKCdGb3VuZCB0aGVzZSByZWZlcmVuY2VkIGlzc3VlczogJywgcmVmZXJlbmNlcyk7XG5cbiAgICBjb25zdCBwdWxsTGFiZWxzID0gbmV3IFNldChwdWxsLmRhdGEubGFiZWxzLm1hcCgobCkgPT4gbC5uYW1lID8/ICcnKSk7XG4gICAgY29uc3QgaXNzdWVMYWJlbHMgPSBuZXcgU2V0KFxuICAgICAgKFxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChyZWZlcmVuY2VzLm1hcCgoaXNzdWUpID0+IHRoaXMuaXNzdWVMYWJlbHMoaXNzdWUpKSlcbiAgICAgICkuZmxhdCgpLFxuICAgICk7XG5cbiAgICBjb25zdCBuZXdQdWxsTGFiZWxzID0gbmV3IFNldChwdWxsTGFiZWxzKTtcbiAgICByZXBsYWNlTGFiZWxzKG5ld1B1bGxMYWJlbHMsIHRoaXMucHJpb3JpdHlMYWJlbHMsIHRoaXMuaGlnaGVzdFByaW9yaXR5TGFiZWwoaXNzdWVMYWJlbHMsIHB1bGxMYWJlbHMpKTtcbiAgICByZXBsYWNlTGFiZWxzKG5ld1B1bGxMYWJlbHMsIHRoaXMuY2xhc3NpZmljYXRpb25MYWJlbHMsIHRoaXMuY2xhc3NpZmljYXRpb24oaXNzdWVMYWJlbHMpKTtcbiAgICByZXBsYWNlTGFiZWxzKG5ld1B1bGxMYWJlbHMsIHRoaXMuZWZmb3J0TGFiZWxzLCB0aGlzLmxhcmdlc3RFZmZvcnQoaXNzdWVMYWJlbHMpKTtcblxuICAgIGNvbnN0IGRpZmYgPSBzZXREaWZmKHB1bGxMYWJlbHMsIG5ld1B1bGxMYWJlbHMpO1xuICAgIGNvbnNvbGUubG9nKCdBZGRpbmcgdGhlc2UgbGFiZWxzOiAnLCBkaWZmLmFkZHMpO1xuICAgIGNvbnNvbGUubG9nKCdSZW1vdmluZyB0aGVzZSBsYWJlbHMnLCBkaWZmLnJlbW92ZXMpO1xuXG4gICAgaWYgKGlzRW1wdHlEaWZmKGRpZmYpKSB7IHJldHVybjsgfVxuXG4gICAgY29uc29sZS5sb2coYCR7cHVsbE51bWJlcn0gKHJlZmVyZW5jZXMgJHtyZWZlcmVuY2VzfSkgJHt2aXpEaWZmKGRpZmYpfWApO1xuICAgIGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgIGRpZmYuYWRkcyA/IHRoaXMuY2xpZW50LnJlc3QuaXNzdWVzLmFkZExhYmVscyh7XG4gICAgICAgIG93bmVyOiB0aGlzLm93bmVyLFxuICAgICAgICByZXBvOiB0aGlzLnJlcG8sXG4gICAgICAgIGlzc3VlX251bWJlcjogcHVsbE51bWJlcixcbiAgICAgICAgbGFiZWxzOiBkaWZmLmFkZHMsXG4gICAgICB9KSA6IFByb21pc2UucmVzb2x2ZSh1bmRlZmluZWQpLFxuICAgICAgZGlmZi5yZW1vdmVzID8gZGlmZi5yZW1vdmVzLmZvckVhY2goKGxhYmVsKSA9PiB0aGlzLmNsaWVudC5yZXN0Lmlzc3Vlcy5yZW1vdmVMYWJlbCh7XG4gICAgICAgIG93bmVyOiB0aGlzLm93bmVyLFxuICAgICAgICByZXBvOiB0aGlzLnJlcG8sXG4gICAgICAgIGlzc3VlX251bWJlcjogcHVsbE51bWJlciEsXG4gICAgICAgIG5hbWU6IGxhYmVsLFxuICAgICAgfSkpIDogUHJvbWlzZS5yZXNvbHZlKHVuZGVmaW5lZCksXG4gICAgXSk7XG4gIH1cblxuICBwcml2YXRlIGZpbmRSZWZlcmVuY2VkSXNzdWVzKHRleHQ6IHN0cmluZyk6IG51bWJlcltdIHtcbiAgICBjb25zdCBoYXNoUmVnZXggPSAvKFxcdyspICMoXFxkKykvZztcbiAgICBjb25zdCB1cmxSZWdleCA9IG5ldyBSZWdFeHAoYChcXFxcdyspIGh0dHBzOi8vZ2l0aHViLmNvbS8ke3RoaXMub3duZXJ9LyR7dGhpcy5yZXBvfS9pc3N1ZXMvKFxcXFxkKylgLCAnZycpO1xuXG4gICAgY29uc3QgaXNzdWVzQ2xvc2VkQnlIYXNoID0gaXNzdWVzQ2xvc2VkKGhhc2hSZWdleCk7XG4gICAgY29uc3QgaXNzdWVzQ2xvc2VkQnlVcmwgPSBpc3N1ZXNDbG9zZWQodXJsUmVnZXgpO1xuXG4gICAgcmV0dXJuIFsuLi5pc3N1ZXNDbG9zZWRCeUhhc2gsIC4uLmlzc3Vlc0Nsb3NlZEJ5VXJsXS5tYXAoKHgpID0+IHBhcnNlSW50KHgsIDEwKSk7XG5cbiAgICBmdW5jdGlvbiBpc3N1ZXNDbG9zZWQocmVnZXg6IFJlZ0V4cCk6IHN0cmluZ1tdIHtcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKHRleHQubWF0Y2hBbGwocmVnZXgpKVxuICAgICAgICAuZmlsdGVyKChtKSA9PiBHSVRIVUJfQ0xPU0VfSVNTVUVfS0VZV09SRFMuaW5jbHVkZXMobVsxXS50b0xvd2VyQ2FzZSgpKSlcbiAgICAgICAgLm1hcCgobSkgPT4gbVsyXSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBpc3N1ZUxhYmVscyhpc3N1ZV9udW1iZXI6IG51bWJlcik6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICBjb25zdCBpc3N1ZSA9IGF3YWl0IHRoaXMuY2xpZW50LnJlc3QuaXNzdWVzLmdldCh7XG4gICAgICBvd25lcjogdGhpcy5vd25lcixcbiAgICAgIHJlcG86IHRoaXMucmVwbyxcbiAgICAgIGlzc3VlX251bWJlcixcbiAgICB9KTtcbiAgICByZXR1cm4gaXNzdWUuZGF0YS5sYWJlbHMubWFwKChsKSA9PiB0eXBlb2YgbCA9PT0gJ3N0cmluZycgPyBsIDogbC5uYW1lID8/ICcnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXZSBtYW5kYXRlIHByaW9yaXR5IGxhYmVscyBldmVuIGlmIHRoZXJlIGFyZSBubyBwcmlvcml0aWVzIGZvdW5kIGluIGxpbmtlZCBpc3N1ZXMuXG4gICAqIEluIHRoZSBhYnNlbmNlIG9mIGEga25vd24gcHJpb3JpdHksIHdlIHdpbGwgbWFpbnRhaW4gcHJpb3JpdHkgdGhhdCB0aGUgUFIgd2FzIG9yaWdpbmFsbHkgbGFiZWxlZC5cbiAgICogSW4gdGhlIGFic2Vuc2Ugb2YgdGhhdCwgd2Ugd2lsbCBsYWJlbCB0aGUgUFIgd2l0aCB0aGUgbG93ZXN0IHByaW9yaXR5IGF2YWlsYWJsZS5cbiAgICovXG4gIHByaXZhdGUgaGlnaGVzdFByaW9yaXR5TGFiZWwoaXNzdWVMYWJlbHM6IFNldDxzdHJpbmc+LCBwdWxsTGFiZWxzOiBTZXQ8c3RyaW5nPik6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMucHJpb3JpdHlMYWJlbHMuZmluZChsID0+IGlzc3VlTGFiZWxzLmhhcyhsKSkgPz9cbiAgICAgIHRoaXMucHJpb3JpdHlMYWJlbHMuZmluZChsID0+IHB1bGxMYWJlbHMuaGFzKGwpKSA/P1xuICAgICAgdGhpcy5wcmlvcml0eUxhYmVsc1t0aGlzLnByaW9yaXR5TGFiZWxzLmxlbmd0aC0xXTtcbiAgfVxuXG4gIHByaXZhdGUgY2xhc3NpZmljYXRpb24obGFiZWxzOiBTZXQ8c3RyaW5nPikge1xuICAgIHJldHVybiB0aGlzLmNsYXNzaWZpY2F0aW9uTGFiZWxzLmZpbmQobCA9PiBsYWJlbHMuaGFzKGwpKTtcbiAgfVxuXG4gIHByaXZhdGUgbGFyZ2VzdEVmZm9ydChsYWJlbHM6IFNldDxzdHJpbmc+KSB7XG4gICAgcmV0dXJuIHRoaXMuZWZmb3J0TGFiZWxzLmZpbmQobCA9PiBsYWJlbHMuaGFzKGwpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZXBsYWNlTGFiZWxzKGxhYmVsczogU2V0PHN0cmluZz4sIHJlbW92ZTogc3RyaW5nW10sIHJlcGxhY2U6IHN0cmluZyB8IHVuZGVmaW5lZCkge1xuICBpZiAocmVwbGFjZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZm9yIChjb25zdCByIG9mIHJlbW92ZSkgeyBsYWJlbHMuZGVsZXRlKHIpOyB9XG4gICAgbGFiZWxzLmFkZChyZXBsYWNlKTtcbiAgfVxufVxuXG5pbnRlcmZhY2UgU2V0RGlmZiB7XG4gIHJlYWRvbmx5IGFkZHM6IHN0cmluZ1tdO1xuICByZWFkb25seSByZW1vdmVzOiBzdHJpbmdbXTtcbn1cblxuZnVuY3Rpb24gc2V0RGlmZih4czogU2V0PHN0cmluZz4sIHlzOiBTZXQ8c3RyaW5nPik6IFNldERpZmYge1xuICBjb25zdCByZXQ6IFNldERpZmYgPSB7IGFkZHM6IFtdLCByZW1vdmVzOiBbXSB9O1xuICBmb3IgKGNvbnN0IHkgb2YgeXMpIHtcbiAgICBpZiAoIXhzLmhhcyh5KSkge1xuICAgICAgcmV0LmFkZHMucHVzaCh5KTtcbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IHggb2YgeHMpIHtcbiAgICBpZiAoIXlzLmhhcyh4KSkge1xuICAgICAgcmV0LnJlbW92ZXMucHVzaCh4KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmV0O1xufVxuXG5mdW5jdGlvbiBpc0VtcHR5RGlmZihkaWZmOiBTZXREaWZmKSB7XG4gIHJldHVybiBkaWZmLmFkZHMubGVuZ3RoICsgZGlmZi5yZW1vdmVzLmxlbmd0aCA9PT0gMDtcbn1cblxuZnVuY3Rpb24gdml6RGlmZihkaWZmOiBTZXREaWZmKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke0pTT04uc3RyaW5naWZ5KGRpZmYucmVtb3Zlcyl9IC0+ICR7SlNPTi5zdHJpbmdpZnkoZGlmZi5hZGRzKX1gO1xufSJdfQ==