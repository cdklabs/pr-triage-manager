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
const core = __importStar(require("@actions/core"));
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
        this.effortLabels = options.effortLabels ?? ['effort-large', 'effort-medium', 'effort-small'];
        if (github.context.payload.pull_request) {
            this.pullNumber = github.context.payload.pull_request.number;
        }
        else {
            core.setFailed('Error retrieving PR');
        }
    }
    async copyLabelsFromReferencedIssues() {
        console.log('Adding labels to PR number ', this.pullNumber);
        if (!this.pullNumber) {
            return;
        }
        const pull = await this.client.rest.pulls.get({
            owner: this.owner,
            repo: this.repo,
            pull_number: this.pullNumber,
        });
        const references = this.findReferencedIssues(pull.data.body ?? '');
        console.log('Found these referenced issues: ', references);
        const pullLabels = new Set(pull.data.labels.map((l) => l.name ?? ''));
        const issueLabels = new Set((await Promise.all(references.map((issue) => this.issueLabels(issue)))).flat());
        const newPullLabels = new Set(pullLabels);
        replaceLabels(newPullLabels, this.priorityLabels, this.highestPriorityLabel(issueLabels));
        replaceLabels(newPullLabels, this.classificationLabels, this.classification(issueLabels));
        replaceLabels(newPullLabels, this.effortLabels, this.largestEffort(issueLabels));
        const diff = setDiff(pullLabels, newPullLabels);
        console.log('Adding these labels: ', diff.adds);
        console.log('Removing these labels', diff.removes);
        if (isEmptyDiff(diff)) {
            return;
        }
        console.log(`${this.pullNumber} (references ${references}) ${vizDiff(diff)}`);
        await Promise.all([
            diff.adds ? this.client.rest.issues.addLabels({
                owner: this.owner,
                repo: this.repo,
                issue_number: this.pullNumber,
                labels: diff.adds,
            }) : Promise.resolve(undefined),
            diff.removes ? diff.removes.forEach((label) => this.client.rest.issues.removeLabel({
                owner: this.owner,
                repo: this.repo,
                issue_number: this.pullNumber,
                name: label,
            })) : Promise.resolve(undefined),
        ]);
    }
    findReferencedIssues(text) {
        const hashRegex = /(\w+) #(\d+)/g;
        const urlRegex = new RegExp(`(\\w+) https://github.com/${this.owner}/${this.repo}/issues/(\\d+)`, 'g');
        console.log(urlRegex);
        const issuesClosedByHash = issuesClosed(hashRegex);
        const issuesClosedByUrl = issuesClosed(urlRegex);
        console.log(text.matchAll(urlRegex));
        console.log(issuesClosedByUrl);
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
     * In the absence of a known priority, we will label the PR with the lowest priority available.
     */
    highestPriorityLabel(labels) {
        return this.priorityLabels.find(l => labels.has(l)) ?? this.priorityLabels[this.priorityLabels.length - 1];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29weS1pc3N1ZS1sYWJlbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvY29weS1pc3N1ZS1sYWJlbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG9EQUFzQztBQUN0Qyx3REFBMEM7QUFFMUMsOEpBQThKO0FBQzlKLE1BQU0sMkJBQTJCLEdBQUc7SUFDbEMsT0FBTztJQUNQLFFBQVE7SUFDUixRQUFRO0lBQ1IsS0FBSztJQUNMLE9BQU87SUFDUCxPQUFPO0lBQ1AsU0FBUztJQUNULFVBQVU7SUFDVixVQUFVO0NBQ1gsQ0FBQztBQW1CRixNQUFhLHVCQUF1QjtJQVNsQyxZQUNFLEtBQWEsRUFDYixPQUF1QztRQUV2QyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDckMsSUFBSSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDdkMsSUFBSSxDQUFDLGNBQWMsR0FBRyxPQUFPLENBQUMsY0FBYyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuRSxJQUFJLENBQUMsb0JBQW9CLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixJQUFJLENBQUMsS0FBSyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDdkYsSUFBSSxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUMsWUFBWSxJQUFJLENBQUMsY0FBYyxFQUFFLGVBQWUsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUU5RixJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRTtZQUN2QyxJQUFJLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FB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O0FBQ2IsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLElBQWE7SUFDaEMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUM7QUFDdEQsQ0FBQztBQUVELFNBQVMsT0FBTyxDQUFDLElBQWE7SUFDNUIsT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7QUFDM0UsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNvcmUgZnJvbSAnQGFjdGlvbnMvY29yZSc7XG5pbXBvcnQgKiBhcyBnaXRodWIgZnJvbSAnQGFjdGlvbnMvZ2l0aHViJztcblxuLy8gc2VlOiBodHRwczovL2RvY3MuZ2l0aHViLmNvbS9lbi9pc3N1ZXMvdHJhY2tpbmcteW91ci13b3JrLXdpdGgtaXNzdWVzL2xpbmtpbmctYS1wdWxsLXJlcXVlc3QtdG8tYW4taXNzdWUjbGlua2luZy1hLXB1bGwtcmVxdWVzdC10by1hbi1pc3N1ZS11c2luZy1hLWtleXdvcmRcbmNvbnN0IEdJVEhVQl9DTE9TRV9JU1NVRV9LRVlXT1JEUyA9IFtcbiAgJ2Nsb3NlJyxcbiAgJ2Nsb3NlcycsXG4gICdjbG9zZWQnLFxuICAnZml4JyxcbiAgJ2ZpeGVzJyxcbiAgJ2ZpeGVkJyxcbiAgJ3Jlc29sdmUnLFxuICAncmVzb2x2ZXMnLFxuICAncmVzb2x2ZWQnLFxuXTtcblxuZXhwb3J0IGludGVyZmFjZSBQdWxsUmVxdXNldExhYmVsTWFuYWdlck9wdGlvbnMge1xuICAvKipcbiAgICogQGRlZmF1bHQgLSBbJ3AwJywgJ3AxJywgJ3AyJ11cbiAgICovXG4gIHJlYWRvbmx5IHByaW9yaXR5TGFiZWxzPzogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIEBkZWZhdWx0IC0gWydidWcnLCAnZmVhdHVyZS1yZXF1ZXN0J11cbiAgICovXG4gIHJlYWRvbmx5IGNsYXNzaWZpY2F0aW9uTGFiZWxzPzogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIEBkZWZhdWx0IC0gWydlZmZvcnQtbGFyZ2UnLCAnZWZmb3J0LW1lZGl1bScsICdlZmZvcnQtc21hbGwnXVxuICAgKi9cbiAgcmVhZG9ubHkgZWZmb3J0TGFiZWxzPzogc3RyaW5nW107XG59XG5cbmV4cG9ydCBjbGFzcyBQdWxsUmVxdWVzdExhYmVsTWFuYWdlciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgY2xpZW50OiBSZXR1cm5UeXBlPHR5cGVvZiBnaXRodWIuZ2V0T2N0b2tpdD47XG4gIHByaXZhdGUgcmVhZG9ubHkgb3duZXI6IHN0cmluZztcbiAgcHJpdmF0ZSByZWFkb25seSByZXBvOiBzdHJpbmc7XG4gIHByaXZhdGUgcmVhZG9ubHkgcHVsbE51bWJlcjogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIHJlYWRvbmx5IHByaW9yaXR5TGFiZWxzOiBzdHJpbmdbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBjbGFzc2lmaWNhdGlvbkxhYmVsczogc3RyaW5nW107XG4gIHByaXZhdGUgcmVhZG9ubHkgZWZmb3J0TGFiZWxzOiBzdHJpbmdbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICB0b2tlbjogc3RyaW5nLFxuICAgIG9wdGlvbnM6IFB1bGxSZXF1c2V0TGFiZWxNYW5hZ2VyT3B0aW9ucyxcbiAgKSB7XG4gICAgdGhpcy5jbGllbnQgPSBnaXRodWIuZ2V0T2N0b2tpdCh0b2tlbik7XG4gICAgdGhpcy5yZXBvID0gZ2l0aHViLmNvbnRleHQucmVwby5yZXBvO1xuICAgIHRoaXMub3duZXIgPSBnaXRodWIuY29udGV4dC5yZXBvLm93bmVyO1xuICAgIHRoaXMucHJpb3JpdHlMYWJlbHMgPSBvcHRpb25zLnByaW9yaXR5TGFiZWxzID8/IFsncDAnLCAncDEnLCAncDInXTtcbiAgICB0aGlzLmNsYXNzaWZpY2F0aW9uTGFiZWxzID0gb3B0aW9ucy5jbGFzc2lmaWNhdGlvbkxhYmVscyA/PyBbJ2J1ZycsICdmZWF0dXJlLXJlcXVlc3QnXTtcbiAgICB0aGlzLmVmZm9ydExhYmVscyA9IG9wdGlvbnMuZWZmb3J0TGFiZWxzID8/IFsnZWZmb3J0LWxhcmdlJywgJ2VmZm9ydC1tZWRpdW0nLCAnZWZmb3J0LXNtYWxsJ107XG5cbiAgICBpZiAoZ2l0aHViLmNvbnRleHQucGF5bG9hZC5wdWxsX3JlcXVlc3QpIHtcbiAgICAgIHRoaXMucHVsbE51bWJlciA9IGdpdGh1Yi5jb250ZXh0LnBheWxvYWQucHVsbF9yZXF1ZXN0Lm51bWJlcjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29yZS5zZXRGYWlsZWQoJ0Vycm9yIHJldHJpZXZpbmcgUFInKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgY29weUxhYmVsc0Zyb21SZWZlcmVuY2VkSXNzdWVzKCkge1xuICAgIGNvbnNvbGUubG9nKCdBZGRpbmcgbGFiZWxzIHRvIFBSIG51bWJlciAnLCB0aGlzLnB1bGxOdW1iZXIpO1xuICAgIGlmICghdGhpcy5wdWxsTnVtYmVyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcHVsbCA9IGF3YWl0IHRoaXMuY2xpZW50LnJlc3QucHVsbHMuZ2V0KHtcbiAgICAgIG93bmVyOiB0aGlzLm93bmVyLFxuICAgICAgcmVwbzogdGhpcy5yZXBvLFxuICAgICAgcHVsbF9udW1iZXI6IHRoaXMucHVsbE51bWJlcixcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlZmVyZW5jZXMgPSB0aGlzLmZpbmRSZWZlcmVuY2VkSXNzdWVzKHB1bGwuZGF0YS5ib2R5ID8/ICcnKTtcbiAgICBjb25zb2xlLmxvZygnRm91bmQgdGhlc2UgcmVmZXJlbmNlZCBpc3N1ZXM6ICcsIHJlZmVyZW5jZXMpO1xuXG4gICAgY29uc3QgcHVsbExhYmVscyA9IG5ldyBTZXQocHVsbC5kYXRhLmxhYmVscy5tYXAoKGwpID0+IGwubmFtZSA/PyAnJykpO1xuICAgIGNvbnN0IGlzc3VlTGFiZWxzID0gbmV3IFNldChcbiAgICAgIChcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocmVmZXJlbmNlcy5tYXAoKGlzc3VlKSA9PiB0aGlzLmlzc3VlTGFiZWxzKGlzc3VlKSkpXG4gICAgICApLmZsYXQoKSxcbiAgICApO1xuXG4gICAgY29uc3QgbmV3UHVsbExhYmVscyA9IG5ldyBTZXQocHVsbExhYmVscyk7XG4gICAgcmVwbGFjZUxhYmVscyhuZXdQdWxsTGFiZWxzLCB0aGlzLnByaW9yaXR5TGFiZWxzLCB0aGlzLmhpZ2hlc3RQcmlvcml0eUxhYmVsKGlzc3VlTGFiZWxzKSk7XG4gICAgcmVwbGFjZUxhYmVscyhuZXdQdWxsTGFiZWxzLCB0aGlzLmNsYXNzaWZpY2F0aW9uTGFiZWxzLCB0aGlzLmNsYXNzaWZpY2F0aW9uKGlzc3VlTGFiZWxzKSk7XG4gICAgcmVwbGFjZUxhYmVscyhuZXdQdWxsTGFiZWxzLCB0aGlzLmVmZm9ydExhYmVscywgdGhpcy5sYXJnZXN0RWZmb3J0KGlzc3VlTGFiZWxzKSk7XG5cbiAgICBjb25zdCBkaWZmID0gc2V0RGlmZihwdWxsTGFiZWxzLCBuZXdQdWxsTGFiZWxzKTtcbiAgICBjb25zb2xlLmxvZygnQWRkaW5nIHRoZXNlIGxhYmVsczogJywgZGlmZi5hZGRzKTtcbiAgICBjb25zb2xlLmxvZygnUmVtb3ZpbmcgdGhlc2UgbGFiZWxzJywgZGlmZi5yZW1vdmVzKTtcblxuICAgIGlmIChpc0VtcHR5RGlmZihkaWZmKSkgeyByZXR1cm47IH1cblxuICAgIGNvbnNvbGUubG9nKGAke3RoaXMucHVsbE51bWJlcn0gKHJlZmVyZW5jZXMgJHtyZWZlcmVuY2VzfSkgJHt2aXpEaWZmKGRpZmYpfWApO1xuICAgIGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgIGRpZmYuYWRkcyA/IHRoaXMuY2xpZW50LnJlc3QuaXNzdWVzLmFkZExhYmVscyh7XG4gICAgICAgIG93bmVyOiB0aGlzLm93bmVyLFxuICAgICAgICByZXBvOiB0aGlzLnJlcG8sXG4gICAgICAgIGlzc3VlX251bWJlcjogdGhpcy5wdWxsTnVtYmVyLFxuICAgICAgICBsYWJlbHM6IGRpZmYuYWRkcyxcbiAgICAgIH0pIDogUHJvbWlzZS5yZXNvbHZlKHVuZGVmaW5lZCksXG4gICAgICBkaWZmLnJlbW92ZXMgPyBkaWZmLnJlbW92ZXMuZm9yRWFjaCgobGFiZWwpID0+IHRoaXMuY2xpZW50LnJlc3QuaXNzdWVzLnJlbW92ZUxhYmVsKHtcbiAgICAgICAgb3duZXI6IHRoaXMub3duZXIsXG4gICAgICAgIHJlcG86IHRoaXMucmVwbyxcbiAgICAgICAgaXNzdWVfbnVtYmVyOiB0aGlzLnB1bGxOdW1iZXIhLFxuICAgICAgICBuYW1lOiBsYWJlbCxcbiAgICAgIH0pKSA6IFByb21pc2UucmVzb2x2ZSh1bmRlZmluZWQpLFxuICAgIF0pO1xuICB9XG5cbiAgcHJpdmF0ZSBmaW5kUmVmZXJlbmNlZElzc3Vlcyh0ZXh0OiBzdHJpbmcpOiBudW1iZXJbXSB7XG4gICAgY29uc3QgaGFzaFJlZ2V4ID0gLyhcXHcrKSAjKFxcZCspL2c7XG4gICAgY29uc3QgdXJsUmVnZXggPSBuZXcgUmVnRXhwKGAoXFxcXHcrKSBodHRwczovL2dpdGh1Yi5jb20vJHt0aGlzLm93bmVyfS8ke3RoaXMucmVwb30vaXNzdWVzLyhcXFxcZCspYCwgJ2cnKTtcblxuICAgIGNvbnNvbGUubG9nKHVybFJlZ2V4KTtcbiAgICBjb25zdCBpc3N1ZXNDbG9zZWRCeUhhc2ggPSBpc3N1ZXNDbG9zZWQoaGFzaFJlZ2V4KTtcbiAgICBjb25zdCBpc3N1ZXNDbG9zZWRCeVVybCA9IGlzc3Vlc0Nsb3NlZCh1cmxSZWdleCk7XG4gICAgY29uc29sZS5sb2codGV4dC5tYXRjaEFsbCh1cmxSZWdleCkpO1xuICAgIGNvbnNvbGUubG9nKGlzc3Vlc0Nsb3NlZEJ5VXJsKTtcbiAgICByZXR1cm4gWy4uLmlzc3Vlc0Nsb3NlZEJ5SGFzaCwgLi4uaXNzdWVzQ2xvc2VkQnlVcmxdLm1hcCgoeCkgPT4gcGFyc2VJbnQoeCwgMTApKTtcblxuICAgIGZ1bmN0aW9uIGlzc3Vlc0Nsb3NlZChyZWdleDogUmVnRXhwKTogc3RyaW5nW10ge1xuICAgICAgcmV0dXJuIEFycmF5LmZyb20odGV4dC5tYXRjaEFsbChyZWdleCkpXG4gICAgICAgIC5maWx0ZXIoKG0pID0+IEdJVEhVQl9DTE9TRV9JU1NVRV9LRVlXT1JEUy5pbmNsdWRlcyhtWzFdLnRvTG93ZXJDYXNlKCkpKVxuICAgICAgICAubWFwKChtKSA9PiBtWzJdKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGlzc3VlTGFiZWxzKGlzc3VlX251bWJlcjogbnVtYmVyKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIGNvbnN0IGlzc3VlID0gYXdhaXQgdGhpcy5jbGllbnQucmVzdC5pc3N1ZXMuZ2V0KHtcbiAgICAgIG93bmVyOiB0aGlzLm93bmVyLFxuICAgICAgcmVwbzogdGhpcy5yZXBvLFxuICAgICAgaXNzdWVfbnVtYmVyLFxuICAgIH0pO1xuICAgIHJldHVybiBpc3N1ZS5kYXRhLmxhYmVscy5tYXAoKGwpID0+IHR5cGVvZiBsID09PSAnc3RyaW5nJyA/IGwgOiBsLm5hbWUgPz8gJycpO1xuICB9XG5cbiAgLyoqXG4gICAqIFdlIG1hbmRhdGUgcHJpb3JpdHkgbGFiZWxzIGV2ZW4gaWYgdGhlcmUgYXJlIG5vIHByaW9yaXRpZXMgZm91bmQgaW4gbGlua2VkIGlzc3Vlcy5cbiAgICogSW4gdGhlIGFic2VuY2Ugb2YgYSBrbm93biBwcmlvcml0eSwgd2Ugd2lsbCBsYWJlbCB0aGUgUFIgd2l0aCB0aGUgbG93ZXN0IHByaW9yaXR5IGF2YWlsYWJsZS5cbiAgICovXG4gIHByaXZhdGUgaGlnaGVzdFByaW9yaXR5TGFiZWwobGFiZWxzOiBTZXQ8c3RyaW5nPik6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMucHJpb3JpdHlMYWJlbHMuZmluZChsID0+IGxhYmVscy5oYXMobCkpID8/IHRoaXMucHJpb3JpdHlMYWJlbHNbdGhpcy5wcmlvcml0eUxhYmVscy5sZW5ndGgtMV07XG4gIH1cblxuICBwcml2YXRlIGNsYXNzaWZpY2F0aW9uKGxhYmVsczogU2V0PHN0cmluZz4pIHtcbiAgICByZXR1cm4gdGhpcy5jbGFzc2lmaWNhdGlvbkxhYmVscy5maW5kKGwgPT4gbGFiZWxzLmhhcyhsKSk7XG4gIH1cblxuICBwcml2YXRlIGxhcmdlc3RFZmZvcnQobGFiZWxzOiBTZXQ8c3RyaW5nPikge1xuICAgIHJldHVybiB0aGlzLmVmZm9ydExhYmVscy5maW5kKGwgPT4gbGFiZWxzLmhhcyhsKSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVwbGFjZUxhYmVscyhsYWJlbHM6IFNldDxzdHJpbmc+LCByZW1vdmU6IHN0cmluZ1tdLCByZXBsYWNlOiBzdHJpbmcgfCB1bmRlZmluZWQpIHtcbiAgaWYgKHJlcGxhY2UgIT09IHVuZGVmaW5lZCkge1xuICAgIGZvciAoY29uc3QgciBvZiByZW1vdmUpIHsgbGFiZWxzLmRlbGV0ZShyKTsgfVxuICAgIGxhYmVscy5hZGQocmVwbGFjZSk7XG4gIH1cbn1cblxuaW50ZXJmYWNlIFNldERpZmYge1xuICByZWFkb25seSBhZGRzOiBzdHJpbmdbXTtcbiAgcmVhZG9ubHkgcmVtb3Zlczogc3RyaW5nW107XG59XG5cbmZ1bmN0aW9uIHNldERpZmYoeHM6IFNldDxzdHJpbmc+LCB5czogU2V0PHN0cmluZz4pOiBTZXREaWZmIHtcbiAgY29uc3QgcmV0OiBTZXREaWZmID0geyBhZGRzOiBbXSwgcmVtb3ZlczogW10gfTtcbiAgZm9yIChjb25zdCB5IG9mIHlzKSB7XG4gICAgaWYgKCF4cy5oYXMoeSkpIHtcbiAgICAgIHJldC5hZGRzLnB1c2goeSk7XG4gICAgfVxuICB9XG5cbiAgZm9yIChjb25zdCB4IG9mIHhzKSB7XG4gICAgaWYgKCF5cy5oYXMoeCkpIHtcbiAgICAgIHJldC5yZW1vdmVzLnB1c2goeCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gaXNFbXB0eURpZmYoZGlmZjogU2V0RGlmZikge1xuICByZXR1cm4gZGlmZi5hZGRzLmxlbmd0aCArIGRpZmYucmVtb3Zlcy5sZW5ndGggPT09IDA7XG59XG5cbmZ1bmN0aW9uIHZpekRpZmYoZGlmZjogU2V0RGlmZik6IHN0cmluZyB7XG4gIHJldHVybiBgJHtKU09OLnN0cmluZ2lmeShkaWZmLnJlbW92ZXMpfSAtPiAke0pTT04uc3RyaW5naWZ5KGRpZmYuYWRkcyl9YDtcbn0iXX0=