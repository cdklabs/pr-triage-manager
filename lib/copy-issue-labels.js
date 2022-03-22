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
        const urlRegex = new RegExp(`(\w+) https://github.com/${this.owner}/${this.repo}/issues/(\d+)`, 'g');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29weS1pc3N1ZS1sYWJlbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvY29weS1pc3N1ZS1sYWJlbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG9EQUFzQztBQUN0Qyx3REFBMEM7QUFFMUMsOEpBQThKO0FBQzlKLE1BQU0sMkJBQTJCLEdBQUc7SUFDbEMsT0FBTztJQUNQLFFBQVE7SUFDUixRQUFRO0lBQ1IsS0FBSztJQUNMLE9BQU87SUFDUCxPQUFPO0lBQ1AsU0FBUztJQUNULFVBQVU7SUFDVixVQUFVO0NBQ1gsQ0FBQztBQW1CRixNQUFhLHVCQUF1QjtJQVNsQyxZQUNFLEtBQWEsRUFDYixPQUF1QztRQUV2QyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDckMsSUFBSSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDdkMsSUFBSSxDQUFDLGNBQWMsR0FBRyxPQUFPLENBQUMsY0FBYyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuRSxJQUFJLENBQUMsb0JBQW9CLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixJQUFJLENBQUMsS0FBSyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDdkYsSUFBSSxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUMsWUFBWSxJQUFJLENBQUMsY0FBYyxFQUFFLGVBQWUsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUU5RixJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRTtZQUN2QyxJQUFJLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FB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O0lBQzVCLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO0FBQzNFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjb3JlIGZyb20gJ0BhY3Rpb25zL2NvcmUnO1xuaW1wb3J0ICogYXMgZ2l0aHViIGZyb20gJ0BhY3Rpb25zL2dpdGh1Yic7XG5cbi8vIHNlZTogaHR0cHM6Ly9kb2NzLmdpdGh1Yi5jb20vZW4vaXNzdWVzL3RyYWNraW5nLXlvdXItd29yay13aXRoLWlzc3Vlcy9saW5raW5nLWEtcHVsbC1yZXF1ZXN0LXRvLWFuLWlzc3VlI2xpbmtpbmctYS1wdWxsLXJlcXVlc3QtdG8tYW4taXNzdWUtdXNpbmctYS1rZXl3b3JkXG5jb25zdCBHSVRIVUJfQ0xPU0VfSVNTVUVfS0VZV09SRFMgPSBbXG4gICdjbG9zZScsXG4gICdjbG9zZXMnLFxuICAnY2xvc2VkJyxcbiAgJ2ZpeCcsXG4gICdmaXhlcycsXG4gICdmaXhlZCcsXG4gICdyZXNvbHZlJyxcbiAgJ3Jlc29sdmVzJyxcbiAgJ3Jlc29sdmVkJyxcbl07XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHVsbFJlcXVzZXRMYWJlbE1hbmFnZXJPcHRpb25zIHtcbiAgLyoqXG4gICAqIEBkZWZhdWx0IC0gWydwMCcsICdwMScsICdwMiddXG4gICAqL1xuICByZWFkb25seSBwcmlvcml0eUxhYmVscz86IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBAZGVmYXVsdCAtIFsnYnVnJywgJ2ZlYXR1cmUtcmVxdWVzdCddXG4gICAqL1xuICByZWFkb25seSBjbGFzc2lmaWNhdGlvbkxhYmVscz86IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBAZGVmYXVsdCAtIFsnZWZmb3J0LWxhcmdlJywgJ2VmZm9ydC1tZWRpdW0nLCAnZWZmb3J0LXNtYWxsJ11cbiAgICovXG4gIHJlYWRvbmx5IGVmZm9ydExhYmVscz86IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgY2xhc3MgUHVsbFJlcXVlc3RMYWJlbE1hbmFnZXIge1xuICBwcml2YXRlIHJlYWRvbmx5IGNsaWVudDogUmV0dXJuVHlwZTx0eXBlb2YgZ2l0aHViLmdldE9jdG9raXQ+O1xuICBwcml2YXRlIHJlYWRvbmx5IG93bmVyOiBzdHJpbmc7XG4gIHByaXZhdGUgcmVhZG9ubHkgcmVwbzogc3RyaW5nO1xuICBwcml2YXRlIHJlYWRvbmx5IHB1bGxOdW1iZXI6IG51bWJlciB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSByZWFkb25seSBwcmlvcml0eUxhYmVsczogc3RyaW5nW107XG4gIHByaXZhdGUgcmVhZG9ubHkgY2xhc3NpZmljYXRpb25MYWJlbHM6IHN0cmluZ1tdO1xuICBwcml2YXRlIHJlYWRvbmx5IGVmZm9ydExhYmVsczogc3RyaW5nW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgdG9rZW46IHN0cmluZyxcbiAgICBvcHRpb25zOiBQdWxsUmVxdXNldExhYmVsTWFuYWdlck9wdGlvbnMsXG4gICkge1xuICAgIHRoaXMuY2xpZW50ID0gZ2l0aHViLmdldE9jdG9raXQodG9rZW4pO1xuICAgIHRoaXMucmVwbyA9IGdpdGh1Yi5jb250ZXh0LnJlcG8ucmVwbztcbiAgICB0aGlzLm93bmVyID0gZ2l0aHViLmNvbnRleHQucmVwby5vd25lcjtcbiAgICB0aGlzLnByaW9yaXR5TGFiZWxzID0gb3B0aW9ucy5wcmlvcml0eUxhYmVscyA/PyBbJ3AwJywgJ3AxJywgJ3AyJ107XG4gICAgdGhpcy5jbGFzc2lmaWNhdGlvbkxhYmVscyA9IG9wdGlvbnMuY2xhc3NpZmljYXRpb25MYWJlbHMgPz8gWydidWcnLCAnZmVhdHVyZS1yZXF1ZXN0J107XG4gICAgdGhpcy5lZmZvcnRMYWJlbHMgPSBvcHRpb25zLmVmZm9ydExhYmVscyA/PyBbJ2VmZm9ydC1sYXJnZScsICdlZmZvcnQtbWVkaXVtJywgJ2VmZm9ydC1zbWFsbCddO1xuXG4gICAgaWYgKGdpdGh1Yi5jb250ZXh0LnBheWxvYWQucHVsbF9yZXF1ZXN0KSB7XG4gICAgICB0aGlzLnB1bGxOdW1iZXIgPSBnaXRodWIuY29udGV4dC5wYXlsb2FkLnB1bGxfcmVxdWVzdC5udW1iZXI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvcmUuc2V0RmFpbGVkKCdFcnJvciByZXRyaWV2aW5nIFBSJyk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGFzeW5jIGNvcHlMYWJlbHNGcm9tUmVmZXJlbmNlZElzc3VlcygpIHtcbiAgICBjb25zb2xlLmxvZygnQWRkaW5nIGxhYmVscyB0byBQUiBudW1iZXIgJywgdGhpcy5wdWxsTnVtYmVyKTtcbiAgICBpZiAoIXRoaXMucHVsbE51bWJlcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHB1bGwgPSBhd2FpdCB0aGlzLmNsaWVudC5yZXN0LnB1bGxzLmdldCh7XG4gICAgICBvd25lcjogdGhpcy5vd25lcixcbiAgICAgIHJlcG86IHRoaXMucmVwbyxcbiAgICAgIHB1bGxfbnVtYmVyOiB0aGlzLnB1bGxOdW1iZXIsXG4gICAgfSk7XG5cbiAgICBjb25zdCByZWZlcmVuY2VzID0gdGhpcy5maW5kUmVmZXJlbmNlZElzc3VlcyhwdWxsLmRhdGEuYm9keSA/PyAnJyk7XG4gICAgY29uc29sZS5sb2coJ0ZvdW5kIHRoZXNlIHJlZmVyZW5jZWQgaXNzdWVzOiAnLCByZWZlcmVuY2VzKTtcblxuICAgIGNvbnN0IHB1bGxMYWJlbHMgPSBuZXcgU2V0KHB1bGwuZGF0YS5sYWJlbHMubWFwKChsKSA9PiBsLm5hbWUgPz8gJycpKTtcbiAgICBjb25zdCBpc3N1ZUxhYmVscyA9IG5ldyBTZXQoXG4gICAgICAoXG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHJlZmVyZW5jZXMubWFwKChpc3N1ZSkgPT4gdGhpcy5pc3N1ZUxhYmVscyhpc3N1ZSkpKVxuICAgICAgKS5mbGF0KCksXG4gICAgKTtcblxuICAgIGNvbnN0IG5ld1B1bGxMYWJlbHMgPSBuZXcgU2V0KHB1bGxMYWJlbHMpO1xuICAgIHJlcGxhY2VMYWJlbHMobmV3UHVsbExhYmVscywgdGhpcy5wcmlvcml0eUxhYmVscywgdGhpcy5oaWdoZXN0UHJpb3JpdHlMYWJlbChpc3N1ZUxhYmVscykpO1xuICAgIHJlcGxhY2VMYWJlbHMobmV3UHVsbExhYmVscywgdGhpcy5jbGFzc2lmaWNhdGlvbkxhYmVscywgdGhpcy5jbGFzc2lmaWNhdGlvbihpc3N1ZUxhYmVscykpO1xuICAgIHJlcGxhY2VMYWJlbHMobmV3UHVsbExhYmVscywgdGhpcy5lZmZvcnRMYWJlbHMsIHRoaXMubGFyZ2VzdEVmZm9ydChpc3N1ZUxhYmVscykpO1xuXG4gICAgY29uc3QgZGlmZiA9IHNldERpZmYocHVsbExhYmVscywgbmV3UHVsbExhYmVscyk7XG4gICAgY29uc29sZS5sb2coJ0FkZGluZyB0aGVzZSBsYWJlbHM6ICcsIGRpZmYuYWRkcyk7XG4gICAgY29uc29sZS5sb2coJ1JlbW92aW5nIHRoZXNlIGxhYmVscycsIGRpZmYucmVtb3Zlcyk7XG5cbiAgICBpZiAoaXNFbXB0eURpZmYoZGlmZikpIHsgcmV0dXJuOyB9XG5cbiAgICBjb25zb2xlLmxvZyhgJHt0aGlzLnB1bGxOdW1iZXJ9IChyZWZlcmVuY2VzICR7cmVmZXJlbmNlc30pICR7dml6RGlmZihkaWZmKX1gKTtcbiAgICBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICBkaWZmLmFkZHMgPyB0aGlzLmNsaWVudC5yZXN0Lmlzc3Vlcy5hZGRMYWJlbHMoe1xuICAgICAgICBvd25lcjogdGhpcy5vd25lcixcbiAgICAgICAgcmVwbzogdGhpcy5yZXBvLFxuICAgICAgICBpc3N1ZV9udW1iZXI6IHRoaXMucHVsbE51bWJlcixcbiAgICAgICAgbGFiZWxzOiBkaWZmLmFkZHMsXG4gICAgICB9KSA6IFByb21pc2UucmVzb2x2ZSh1bmRlZmluZWQpLFxuICAgICAgZGlmZi5yZW1vdmVzID8gZGlmZi5yZW1vdmVzLmZvckVhY2goKGxhYmVsKSA9PiB0aGlzLmNsaWVudC5yZXN0Lmlzc3Vlcy5yZW1vdmVMYWJlbCh7XG4gICAgICAgIG93bmVyOiB0aGlzLm93bmVyLFxuICAgICAgICByZXBvOiB0aGlzLnJlcG8sXG4gICAgICAgIGlzc3VlX251bWJlcjogdGhpcy5wdWxsTnVtYmVyISxcbiAgICAgICAgbmFtZTogbGFiZWwsXG4gICAgICB9KSkgOiBQcm9taXNlLnJlc29sdmUodW5kZWZpbmVkKSxcbiAgICBdKTtcbiAgfVxuXG4gIHByaXZhdGUgZmluZFJlZmVyZW5jZWRJc3N1ZXModGV4dDogc3RyaW5nKTogbnVtYmVyW10ge1xuICAgIGNvbnN0IGhhc2hSZWdleCA9IC8oXFx3KykgIyhcXGQrKS9nO1xuICAgIGNvbnN0IHVybFJlZ2V4ID0gbmV3IFJlZ0V4cChgKFxcdyspIGh0dHBzOi8vZ2l0aHViLmNvbS8ke3RoaXMub3duZXJ9LyR7dGhpcy5yZXBvfS9pc3N1ZXMvKFxcZCspYCwgJ2cnKTtcblxuICAgIGNvbnN0IGlzc3Vlc0Nsb3NlZEJ5SGFzaCA9aXNzdWVzQ2xvc2VkKGhhc2hSZWdleCk7XG4gICAgY29uc3QgaXNzdWVzQ2xvc2VkQnlVcmwgPSBpc3N1ZXNDbG9zZWQodXJsUmVnZXgpO1xuXG4gICAgcmV0dXJuIFsuLi5pc3N1ZXNDbG9zZWRCeUhhc2gsIC4uLmlzc3Vlc0Nsb3NlZEJ5VXJsXS5tYXAoKHgpID0+IHBhcnNlSW50KHgsIDEwKSk7XG5cbiAgICBmdW5jdGlvbiBpc3N1ZXNDbG9zZWQocmVnZXg6IFJlZ0V4cCk6IHN0cmluZ1tdIHtcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKHRleHQubWF0Y2hBbGwocmVnZXgpKVxuICAgICAgICAuZmlsdGVyKChtKSA9PiBHSVRIVUJfQ0xPU0VfSVNTVUVfS0VZV09SRFMuaW5jbHVkZXMobVsxXS50b0xvd2VyQ2FzZSgpKSlcbiAgICAgICAgLm1hcCgobSkgPT4gbVsyXSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBpc3N1ZUxhYmVscyhpc3N1ZV9udW1iZXI6IG51bWJlcik6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICBjb25zdCBpc3N1ZSA9IGF3YWl0IHRoaXMuY2xpZW50LnJlc3QuaXNzdWVzLmdldCh7XG4gICAgICBvd25lcjogdGhpcy5vd25lcixcbiAgICAgIHJlcG86IHRoaXMucmVwbyxcbiAgICAgIGlzc3VlX251bWJlcixcbiAgICB9KTtcbiAgICByZXR1cm4gaXNzdWUuZGF0YS5sYWJlbHMubWFwKChsKSA9PiB0eXBlb2YgbCA9PT0gJ3N0cmluZycgPyBsIDogbC5uYW1lID8/ICcnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXZSBtYW5kYXRlIHByaW9yaXR5IGxhYmVscyBldmVuIGlmIHRoZXJlIGFyZSBubyBwcmlvcml0aWVzIGZvdW5kIGluIGxpbmtlZCBpc3N1ZXMuXG4gICAqIEluIHRoZSBhYnNlbmNlIG9mIGEga25vd24gcHJpb3JpdHksIHdlIHdpbGwgbGFiZWwgdGhlIFBSIHdpdGggdGhlIGxvd2VzdCBwcmlvcml0eSBhdmFpbGFibGUuXG4gICAqL1xuICBwcml2YXRlIGhpZ2hlc3RQcmlvcml0eUxhYmVsKGxhYmVsczogU2V0PHN0cmluZz4pOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnByaW9yaXR5TGFiZWxzLmZpbmQobCA9PiBsYWJlbHMuaGFzKGwpKSA/PyB0aGlzLnByaW9yaXR5TGFiZWxzW3RoaXMucHJpb3JpdHlMYWJlbHMubGVuZ3RoLTFdO1xuICB9XG5cbiAgcHJpdmF0ZSBjbGFzc2lmaWNhdGlvbihsYWJlbHM6IFNldDxzdHJpbmc+KSB7XG4gICAgcmV0dXJuIHRoaXMuY2xhc3NpZmljYXRpb25MYWJlbHMuZmluZChsID0+IGxhYmVscy5oYXMobCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBsYXJnZXN0RWZmb3J0KGxhYmVsczogU2V0PHN0cmluZz4pIHtcbiAgICByZXR1cm4gdGhpcy5lZmZvcnRMYWJlbHMuZmluZChsID0+IGxhYmVscy5oYXMobCkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlcGxhY2VMYWJlbHMobGFiZWxzOiBTZXQ8c3RyaW5nPiwgcmVtb3ZlOiBzdHJpbmdbXSwgcmVwbGFjZTogc3RyaW5nIHwgdW5kZWZpbmVkKSB7XG4gIGlmIChyZXBsYWNlICE9PSB1bmRlZmluZWQpIHtcbiAgICBmb3IgKGNvbnN0IHIgb2YgcmVtb3ZlKSB7IGxhYmVscy5kZWxldGUocik7IH1cbiAgICBsYWJlbHMuYWRkKHJlcGxhY2UpO1xuICB9XG59XG5cbmludGVyZmFjZSBTZXREaWZmIHtcbiAgcmVhZG9ubHkgYWRkczogc3RyaW5nW107XG4gIHJlYWRvbmx5IHJlbW92ZXM6IHN0cmluZ1tdO1xufVxuXG5mdW5jdGlvbiBzZXREaWZmKHhzOiBTZXQ8c3RyaW5nPiwgeXM6IFNldDxzdHJpbmc+KTogU2V0RGlmZiB7XG4gIGNvbnN0IHJldDogU2V0RGlmZiA9IHsgYWRkczogW10sIHJlbW92ZXM6IFtdIH07XG4gIGZvciAoY29uc3QgeSBvZiB5cykge1xuICAgIGlmICgheHMuaGFzKHkpKSB7XG4gICAgICByZXQuYWRkcy5wdXNoKHkpO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoY29uc3QgeCBvZiB4cykge1xuICAgIGlmICgheXMuaGFzKHgpKSB7XG4gICAgICByZXQucmVtb3Zlcy5wdXNoKHgpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIGlzRW1wdHlEaWZmKGRpZmY6IFNldERpZmYpIHtcbiAgcmV0dXJuIGRpZmYuYWRkcy5sZW5ndGggKyBkaWZmLnJlbW92ZXMubGVuZ3RoID09PSAwO1xufVxuXG5mdW5jdGlvbiB2aXpEaWZmKGRpZmY6IFNldERpZmYpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7SlNPTi5zdHJpbmdpZnkoZGlmZi5yZW1vdmVzKX0gLT4gJHtKU09OLnN0cmluZ2lmeShkaWZmLmFkZHMpfWA7XG59Il19