"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29weS1pc3N1ZS1sYWJlbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvY29weS1pc3N1ZS1sYWJlbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx3REFBMEM7QUFFMUMsOEpBQThKO0FBQzlKLE1BQU0sMkJBQTJCLEdBQUc7SUFDbEMsT0FBTztJQUNQLFFBQVE7SUFDUixRQUFRO0lBQ1IsS0FBSztJQUNMLE9BQU87SUFDUCxPQUFPO0lBQ1AsU0FBUztJQUNULFVBQVU7SUFDVixVQUFVO0NBQ1gsQ0FBQztBQXdCRixNQUFhLHVCQUF1QjtJQVNsQyxZQUNFLEtBQWEsRUFDYixPQUF1QztRQUV2QyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDckMsSUFBSSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDdkMsSUFBSSxDQUFDLGNBQWMsR0FBRyxPQUFPLENBQUMsY0FBYyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuRSxJQUFJLENBQUMsb0JBQW9CLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixJQUFJLENBQUMsS0FBSyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDdkYsSUFBSSxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUMsWUFBWSxJQUFJLENBQUMsY0FBYyxFQUFFLGVBQWUsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUU5RixtRUFBbUU7UUFDbkUsNEZBQTRGO1FBQzVGLHdDQUF3QztRQUN4QyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsT0FBTyxDQUFDLFdBQVcsSUFBSSxPQUFPLENBQUMsV0FBVyxDQUFD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SSxFQUFFLEVBQUU7UUFDbEIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDZCxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNyQjtLQUNGO0lBRUQsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBRUQsU0FBUyxXQUFXLENBQUMsSUFBYTtJQUNoQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQztBQUN0RCxDQUFDO0FBRUQsU0FBUyxPQUFPLENBQUMsSUFBYTtJQUM1QixPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztBQUMzRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZ2l0aHViIGZyb20gJ0BhY3Rpb25zL2dpdGh1Yic7XG5cbi8vIHNlZTogaHR0cHM6Ly9kb2NzLmdpdGh1Yi5jb20vZW4vaXNzdWVzL3RyYWNraW5nLXlvdXItd29yay13aXRoLWlzc3Vlcy9saW5raW5nLWEtcHVsbC1yZXF1ZXN0LXRvLWFuLWlzc3VlI2xpbmtpbmctYS1wdWxsLXJlcXVlc3QtdG8tYW4taXNzdWUtdXNpbmctYS1rZXl3b3JkXG5jb25zdCBHSVRIVUJfQ0xPU0VfSVNTVUVfS0VZV09SRFMgPSBbXG4gICdjbG9zZScsXG4gICdjbG9zZXMnLFxuICAnY2xvc2VkJyxcbiAgJ2ZpeCcsXG4gICdmaXhlcycsXG4gICdmaXhlZCcsXG4gICdyZXNvbHZlJyxcbiAgJ3Jlc29sdmVzJyxcbiAgJ3Jlc29sdmVkJyxcbl07XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHVsbFJlcXVzZXRMYWJlbE1hbmFnZXJPcHRpb25zIHtcbiAgLyoqXG4gICAqIEBkZWZhdWx0IC0gWydwMCcsICdwMScsICdwMiddXG4gICAqL1xuICByZWFkb25seSBwcmlvcml0eUxhYmVscz86IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBAZGVmYXVsdCAtIFsnYnVnJywgJ2ZlYXR1cmUtcmVxdWVzdCddXG4gICAqL1xuICByZWFkb25seSBjbGFzc2lmaWNhdGlvbkxhYmVscz86IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBAZGVmYXVsdCAtIFsnZWZmb3J0LWxhcmdlJywgJ2VmZm9ydC1tZWRpdW0nLCAnZWZmb3J0LXNtYWxsJ11cbiAgICovXG4gIHJlYWRvbmx5IGVmZm9ydExhYmVscz86IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBAZGVmYXVsdCAtIG5vIHByb3ZpZGVkIHB1bGwgbnVtYmVycywgc28gd2lsbCBnZXQgbnVtYmVyIGZyb20gY29udGV4dFxuICAgKi9cbiAgcmVhZG9ubHkgcHVsbE51bWJlcnM/OiBudW1iZXJbXTtcbn1cblxuZXhwb3J0IGNsYXNzIFB1bGxSZXF1ZXN0TGFiZWxNYW5hZ2VyIHtcbiAgcHJpdmF0ZSByZWFkb25seSBjbGllbnQ6IFJldHVyblR5cGU8dHlwZW9mIGdpdGh1Yi5nZXRPY3Rva2l0PjtcbiAgcHJpdmF0ZSByZWFkb25seSBvd25lcjogc3RyaW5nO1xuICBwcml2YXRlIHJlYWRvbmx5IHJlcG86IHN0cmluZztcbiAgcHJpdmF0ZSByZWFkb25seSBwdWxsTnVtYmVyczogbnVtYmVyW107XG4gIHByaXZhdGUgcmVhZG9ubHkgcHJpb3JpdHlMYWJlbHM6IHN0cmluZ1tdO1xuICBwcml2YXRlIHJlYWRvbmx5IGNsYXNzaWZpY2F0aW9uTGFiZWxzOiBzdHJpbmdbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBlZmZvcnRMYWJlbHM6IHN0cmluZ1tdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHRva2VuOiBzdHJpbmcsXG4gICAgb3B0aW9uczogUHVsbFJlcXVzZXRMYWJlbE1hbmFnZXJPcHRpb25zLFxuICApIHtcbiAgICB0aGlzLmNsaWVudCA9IGdpdGh1Yi5nZXRPY3Rva2l0KHRva2VuKTtcbiAgICB0aGlzLnJlcG8gPSBnaXRodWIuY29udGV4dC5yZXBvLnJlcG87XG4gICAgdGhpcy5vd25lciA9IGdpdGh1Yi5jb250ZXh0LnJlcG8ub3duZXI7XG4gICAgdGhpcy5wcmlvcml0eUxhYmVscyA9IG9wdGlvbnMucHJpb3JpdHlMYWJlbHMgPz8gWydwMCcsICdwMScsICdwMiddO1xuICAgIHRoaXMuY2xhc3NpZmljYXRpb25MYWJlbHMgPSBvcHRpb25zLmNsYXNzaWZpY2F0aW9uTGFiZWxzID8/IFsnYnVnJywgJ2ZlYXR1cmUtcmVxdWVzdCddO1xuICAgIHRoaXMuZWZmb3J0TGFiZWxzID0gb3B0aW9ucy5lZmZvcnRMYWJlbHMgPz8gWydlZmZvcnQvbGFyZ2UnLCAnZWZmb3J0L21lZGl1bScsICdlZmZvcnQvc21hbGwnXTtcblxuICAgIC8vIElmIHB1bGwgbnVtYmVycyBhcmUgc3VwcGxpZWQsIHdlIHdpbGwgdHJ5IHRvIGNvcHkgbGFiZWxzIHRvIGVhY2hcbiAgICAvLyBJZiBwdWxsIG51bWJlcnMgYXJlIG5vdCBzdXBwbGllZCwgd2Ugd2lsbCBmaW5kIHRoZSBwdWxsIHJlcXVlc3QgdGhhdCB0cmlnZ2VyZWQgdGhlIGFjdGlvblxuICAgIC8vIGFuZCBjb3B5IGxhYmVscyBvbiB0aGF0IHB1bGwgcmVxdWVzdC5cbiAgICB0aGlzLnB1bGxOdW1iZXJzID0gKG9wdGlvbnMucHVsbE51bWJlcnMgJiYgb3B0aW9ucy5wdWxsTnVtYmVycy5sZW5ndGggPiAwKSA/XG4gICAgICBvcHRpb25zLnB1bGxOdW1iZXJzIDpcbiAgICAgIFtdO1xuXG4gICAgaWYgKGdpdGh1Yi5jb250ZXh0LnBheWxvYWQucHVsbF9yZXF1ZXN0KSB7XG4gICAgICB0aGlzLnB1bGxOdW1iZXJzLnB1c2goZ2l0aHViLmNvbnRleHQucGF5bG9hZC5wdWxsX3JlcXVlc3QubnVtYmVyKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgZG9QdWxscygpIHtcbiAgICBmb3IgKGNvbnN0IHB1bGwgb2YgdGhpcy5wdWxsTnVtYmVycykge1xuICAgICAgYXdhaXQgdGhpcy5jb3B5TGFiZWxzRnJvbVJlZmVyZW5jZWRJc3N1ZXMocHVsbCk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGFzeW5jIGNvcHlMYWJlbHNGcm9tUmVmZXJlbmNlZElzc3VlcyhwdWxsTnVtYmVyOiBudW1iZXIpIHtcbiAgICBjb25zb2xlLmxvZygnQWRkaW5nIGxhYmVscyB0byBQUiBudW1iZXIgJywgcHVsbE51bWJlcik7XG5cbiAgICBjb25zdCBwdWxsID0gYXdhaXQgdGhpcy5jbGllbnQucmVzdC5wdWxscy5nZXQoe1xuICAgICAgb3duZXI6IHRoaXMub3duZXIsXG4gICAgICByZXBvOiB0aGlzLnJlcG8sXG4gICAgICBwdWxsX251bWJlcjogcHVsbE51bWJlcixcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlZmVyZW5jZXMgPSB0aGlzLmZpbmRSZWZlcmVuY2VkSXNzdWVzKHB1bGwuZGF0YS5ib2R5ID8/ICcnKTtcbiAgICBjb25zb2xlLmxvZygnRm91bmQgdGhlc2UgcmVmZXJlbmNlZCBpc3N1ZXM6ICcsIHJlZmVyZW5jZXMpO1xuXG4gICAgY29uc3QgcHVsbExhYmVscyA9IG5ldyBTZXQocHVsbC5kYXRhLmxhYmVscy5tYXAoKGwpID0+IGwubmFtZSA/PyAnJykpO1xuICAgIGNvbnN0IGlzc3VlTGFiZWxzID0gbmV3IFNldChcbiAgICAgIChcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocmVmZXJlbmNlcy5tYXAoKGlzc3VlKSA9PiB0aGlzLmlzc3VlTGFiZWxzKGlzc3VlKSkpXG4gICAgICApLmZsYXQoKSxcbiAgICApO1xuXG4gICAgY29uc3QgbmV3UHVsbExhYmVscyA9IG5ldyBTZXQocHVsbExhYmVscyk7XG4gICAgcmVwbGFjZUxhYmVscyhuZXdQdWxsTGFiZWxzLCB0aGlzLnByaW9yaXR5TGFiZWxzLCB0aGlzLmhpZ2hlc3RQcmlvcml0eUxhYmVsKGlzc3VlTGFiZWxzLCBwdWxsTGFiZWxzKSk7XG4gICAgcmVwbGFjZUxhYmVscyhuZXdQdWxsTGFiZWxzLCB0aGlzLmNsYXNzaWZpY2F0aW9uTGFiZWxzLCB0aGlzLmNsYXNzaWZpY2F0aW9uKGlzc3VlTGFiZWxzKSk7XG4gICAgcmVwbGFjZUxhYmVscyhuZXdQdWxsTGFiZWxzLCB0aGlzLmVmZm9ydExhYmVscywgdGhpcy5sYXJnZXN0RWZmb3J0KGlzc3VlTGFiZWxzKSk7XG5cbiAgICBjb25zdCBkaWZmID0gc2V0RGlmZihwdWxsTGFiZWxzLCBuZXdQdWxsTGFiZWxzKTtcbiAgICBjb25zb2xlLmxvZygnQWRkaW5nIHRoZXNlIGxhYmVsczogJywgZGlmZi5hZGRzKTtcbiAgICBjb25zb2xlLmxvZygnUmVtb3ZpbmcgdGhlc2UgbGFiZWxzJywgZGlmZi5yZW1vdmVzKTtcblxuICAgIGlmIChpc0VtcHR5RGlmZihkaWZmKSkgeyByZXR1cm47IH1cblxuICAgIGNvbnNvbGUubG9nKGAke3B1bGxOdW1iZXJ9IChyZWZlcmVuY2VzICR7cmVmZXJlbmNlc30pICR7dml6RGlmZihkaWZmKX1gKTtcbiAgICBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICBkaWZmLmFkZHMgPyB0aGlzLmNsaWVudC5yZXN0Lmlzc3Vlcy5hZGRMYWJlbHMoe1xuICAgICAgICBvd25lcjogdGhpcy5vd25lcixcbiAgICAgICAgcmVwbzogdGhpcy5yZXBvLFxuICAgICAgICBpc3N1ZV9udW1iZXI6IHB1bGxOdW1iZXIsXG4gICAgICAgIGxhYmVsczogZGlmZi5hZGRzLFxuICAgICAgfSkgOiBQcm9taXNlLnJlc29sdmUodW5kZWZpbmVkKSxcbiAgICAgIGRpZmYucmVtb3ZlcyA/IGRpZmYucmVtb3Zlcy5mb3JFYWNoKChsYWJlbCkgPT4gdGhpcy5jbGllbnQucmVzdC5pc3N1ZXMucmVtb3ZlTGFiZWwoe1xuICAgICAgICBvd25lcjogdGhpcy5vd25lcixcbiAgICAgICAgcmVwbzogdGhpcy5yZXBvLFxuICAgICAgICBpc3N1ZV9udW1iZXI6IHB1bGxOdW1iZXIhLFxuICAgICAgICBuYW1lOiBsYWJlbCxcbiAgICAgIH0pKSA6IFByb21pc2UucmVzb2x2ZSh1bmRlZmluZWQpLFxuICAgIF0pO1xuICB9XG5cbiAgcHJpdmF0ZSBmaW5kUmVmZXJlbmNlZElzc3Vlcyh0ZXh0OiBzdHJpbmcpOiBudW1iZXJbXSB7XG4gICAgY29uc3QgaGFzaFJlZ2V4ID0gLyhcXHcrKSAjKFxcZCspL2c7XG4gICAgY29uc3QgdXJsUmVnZXggPSBuZXcgUmVnRXhwKGAoXFxcXHcrKSBodHRwczovL2dpdGh1Yi5jb20vJHt0aGlzLm93bmVyfS8ke3RoaXMucmVwb30vaXNzdWVzLyhcXFxcZCspYCwgJ2cnKTtcblxuICAgIGNvbnN0IGlzc3Vlc0Nsb3NlZEJ5SGFzaCA9IGlzc3Vlc0Nsb3NlZChoYXNoUmVnZXgpO1xuICAgIGNvbnN0IGlzc3Vlc0Nsb3NlZEJ5VXJsID0gaXNzdWVzQ2xvc2VkKHVybFJlZ2V4KTtcblxuICAgIHJldHVybiBbLi4uaXNzdWVzQ2xvc2VkQnlIYXNoLCAuLi5pc3N1ZXNDbG9zZWRCeVVybF0ubWFwKCh4KSA9PiBwYXJzZUludCh4LCAxMCkpO1xuXG4gICAgZnVuY3Rpb24gaXNzdWVzQ2xvc2VkKHJlZ2V4OiBSZWdFeHApOiBzdHJpbmdbXSB7XG4gICAgICByZXR1cm4gQXJyYXkuZnJvbSh0ZXh0Lm1hdGNoQWxsKHJlZ2V4KSlcbiAgICAgICAgLmZpbHRlcigobSkgPT4gR0lUSFVCX0NMT1NFX0lTU1VFX0tFWVdPUkRTLmluY2x1ZGVzKG1bMV0udG9Mb3dlckNhc2UoKSkpXG4gICAgICAgIC5tYXAoKG0pID0+IG1bMl0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaXNzdWVMYWJlbHMoaXNzdWVfbnVtYmVyOiBudW1iZXIpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgY29uc3QgaXNzdWUgPSBhd2FpdCB0aGlzLmNsaWVudC5yZXN0Lmlzc3Vlcy5nZXQoe1xuICAgICAgb3duZXI6IHRoaXMub3duZXIsXG4gICAgICByZXBvOiB0aGlzLnJlcG8sXG4gICAgICBpc3N1ZV9udW1iZXIsXG4gICAgfSk7XG4gICAgcmV0dXJuIGlzc3VlLmRhdGEubGFiZWxzLm1hcCgobCkgPT4gdHlwZW9mIGwgPT09ICdzdHJpbmcnID8gbCA6IGwubmFtZSA/PyAnJyk7XG4gIH1cblxuICAvKipcbiAgICogV2UgbWFuZGF0ZSBwcmlvcml0eSBsYWJlbHMgZXZlbiBpZiB0aGVyZSBhcmUgbm8gcHJpb3JpdGllcyBmb3VuZCBpbiBsaW5rZWQgaXNzdWVzLlxuICAgKiBJbiB0aGUgYWJzZW5jZSBvZiBhIGtub3duIHByaW9yaXR5LCB3ZSB3aWxsIG1haW50YWluIHByaW9yaXR5IHRoYXQgdGhlIFBSIHdhcyBvcmlnaW5hbGx5IGxhYmVsZWQuXG4gICAqIEluIHRoZSBhYnNlbnNlIG9mIHRoYXQsIHdlIHdpbGwgbGFiZWwgdGhlIFBSIHdpdGggdGhlIGxvd2VzdCBwcmlvcml0eSBhdmFpbGFibGUuXG4gICAqL1xuICBwcml2YXRlIGhpZ2hlc3RQcmlvcml0eUxhYmVsKGlzc3VlTGFiZWxzOiBTZXQ8c3RyaW5nPiwgcHVsbExhYmVsczogU2V0PHN0cmluZz4pOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnByaW9yaXR5TGFiZWxzLmZpbmQobCA9PiBpc3N1ZUxhYmVscy5oYXMobCkpID8/XG4gICAgICB0aGlzLnByaW9yaXR5TGFiZWxzLmZpbmQobCA9PiBwdWxsTGFiZWxzLmhhcyhsKSkgPz9cbiAgICAgIHRoaXMucHJpb3JpdHlMYWJlbHNbdGhpcy5wcmlvcml0eUxhYmVscy5sZW5ndGgtMV07XG4gIH1cblxuICBwcml2YXRlIGNsYXNzaWZpY2F0aW9uKGxhYmVsczogU2V0PHN0cmluZz4pIHtcbiAgICByZXR1cm4gdGhpcy5jbGFzc2lmaWNhdGlvbkxhYmVscy5maW5kKGwgPT4gbGFiZWxzLmhhcyhsKSk7XG4gIH1cblxuICBwcml2YXRlIGxhcmdlc3RFZmZvcnQobGFiZWxzOiBTZXQ8c3RyaW5nPikge1xuICAgIHJldHVybiB0aGlzLmVmZm9ydExhYmVscy5maW5kKGwgPT4gbGFiZWxzLmhhcyhsKSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVwbGFjZUxhYmVscyhsYWJlbHM6IFNldDxzdHJpbmc+LCByZW1vdmU6IHN0cmluZ1tdLCByZXBsYWNlOiBzdHJpbmcgfCB1bmRlZmluZWQpIHtcbiAgaWYgKHJlcGxhY2UgIT09IHVuZGVmaW5lZCkge1xuICAgIGZvciAoY29uc3QgciBvZiByZW1vdmUpIHsgbGFiZWxzLmRlbGV0ZShyKTsgfVxuICAgIGxhYmVscy5hZGQocmVwbGFjZSk7XG4gIH1cbn1cblxuaW50ZXJmYWNlIFNldERpZmYge1xuICByZWFkb25seSBhZGRzOiBzdHJpbmdbXTtcbiAgcmVhZG9ubHkgcmVtb3Zlczogc3RyaW5nW107XG59XG5cbmZ1bmN0aW9uIHNldERpZmYoeHM6IFNldDxzdHJpbmc+LCB5czogU2V0PHN0cmluZz4pOiBTZXREaWZmIHtcbiAgY29uc3QgcmV0OiBTZXREaWZmID0geyBhZGRzOiBbXSwgcmVtb3ZlczogW10gfTtcbiAgZm9yIChjb25zdCB5IG9mIHlzKSB7XG4gICAgaWYgKCF4cy5oYXMoeSkpIHtcbiAgICAgIHJldC5hZGRzLnB1c2goeSk7XG4gICAgfVxuICB9XG5cbiAgZm9yIChjb25zdCB4IG9mIHhzKSB7XG4gICAgaWYgKCF5cy5oYXMoeCkpIHtcbiAgICAgIHJldC5yZW1vdmVzLnB1c2goeCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gaXNFbXB0eURpZmYoZGlmZjogU2V0RGlmZikge1xuICByZXR1cm4gZGlmZi5hZGRzLmxlbmd0aCArIGRpZmYucmVtb3Zlcy5sZW5ndGggPT09IDA7XG59XG5cbmZ1bmN0aW9uIHZpekRpZmYoZGlmZjogU2V0RGlmZik6IHN0cmluZyB7XG4gIHJldHVybiBgJHtKU09OLnN0cmluZ2lmeShkaWZmLnJlbW92ZXMpfSAtPiAke0pTT04uc3RyaW5naWZ5KGRpZmYuYWRkcyl9YDtcbn0iXX0=