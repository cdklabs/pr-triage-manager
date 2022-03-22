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
const core = __importStar(require("@actions/core"));
const copy_issue_labels_1 = require("./copy-issue-labels");
async function run() {
    core.setOutput('labeled', false.toString());
    const token = core.getInput('github-token');
    const priorityLabels = core
        .getInput('priority-labels', { required: false })
        .replace(/\[|\]/gi, '')
        .split('|');
    const classificationLabels = core
        .getInput('classification-labels', { required: false })
        .replace(/\[|\]/gi, '')
        .split('|');
    const copier = new copy_issue_labels_1.PullRequestLabelManager(token, {
        priorityLabels: priorityLabels,
        classificationLabels: classificationLabels,
    });
    await copier.copyLabelsFromReferencedIssues();
}
run().catch(error => {
    core.setFailed(error.message);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0RBQXNDO0FBQ3RDLDJEQUE4RDtBQUU5RCxLQUFLLFVBQVUsR0FBRztJQUNoQixJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUU1QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQzVDLE1BQU0sY0FBYyxHQUF5QixJQUFJO1NBQzlDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQztTQUNoRCxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQztTQUN0QixLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDZCxNQUFNLG9CQUFvQixHQUF5QixJQUFJO1NBQ3BELFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQztTQUN0RCxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQztTQUN0QixLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFZCxNQUFNLE1BQU0sR0FBRyxJQUFJLDJDQUF1QixDQUFDLEtBQUssRUFBRTtRQUNoRCxjQUFjLEVBQUUsY0FBYztRQUM5QixvQkFBb0IsRUFBRSxvQkFBb0I7S0FDM0MsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxNQUFNLENBQUMsOEJBQThCLEVBQUUsQ0FBQztBQUNoRCxDQUFDO0FBRUQsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFO0lBQ2xCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY29yZSBmcm9tICdAYWN0aW9ucy9jb3JlJztcbmltcG9ydCB7IFB1bGxSZXF1ZXN0TGFiZWxNYW5hZ2VyIH0gZnJvbSAnLi9jb3B5LWlzc3VlLWxhYmVscyc7XG5cbmFzeW5jIGZ1bmN0aW9uIHJ1bigpIHtcbiAgY29yZS5zZXRPdXRwdXQoJ2xhYmVsZWQnLCBmYWxzZS50b1N0cmluZygpKTtcblxuICBjb25zdCB0b2tlbiA9IGNvcmUuZ2V0SW5wdXQoJ2dpdGh1Yi10b2tlbicpO1xuICBjb25zdCBwcmlvcml0eUxhYmVsczogc3RyaW5nW10gfCB1bmRlZmluZWQgPSBjb3JlXG4gICAgLmdldElucHV0KCdwcmlvcml0eS1sYWJlbHMnLCB7IHJlcXVpcmVkOiBmYWxzZSB9KVxuICAgIC5yZXBsYWNlKC9cXFt8XFxdL2dpLCAnJylcbiAgICAuc3BsaXQoJ3wnKTtcbiAgY29uc3QgY2xhc3NpZmljYXRpb25MYWJlbHM6IHN0cmluZ1tdIHwgdW5kZWZpbmVkID0gY29yZVxuICAgIC5nZXRJbnB1dCgnY2xhc3NpZmljYXRpb24tbGFiZWxzJywgeyByZXF1aXJlZDogZmFsc2UgfSlcbiAgICAucmVwbGFjZSgvXFxbfFxcXS9naSwgJycpXG4gICAgLnNwbGl0KCd8Jyk7XG5cbiAgY29uc3QgY29waWVyID0gbmV3IFB1bGxSZXF1ZXN0TGFiZWxNYW5hZ2VyKHRva2VuLCB7XG4gICAgcHJpb3JpdHlMYWJlbHM6IHByaW9yaXR5TGFiZWxzLFxuICAgIGNsYXNzaWZpY2F0aW9uTGFiZWxzOiBjbGFzc2lmaWNhdGlvbkxhYmVscyxcbiAgfSk7XG4gIGF3YWl0IGNvcGllci5jb3B5TGFiZWxzRnJvbVJlZmVyZW5jZWRJc3N1ZXMoKTtcbn1cblxucnVuKCkuY2F0Y2goZXJyb3IgPT4ge1xuICBjb3JlLnNldEZhaWxlZChlcnJvci5tZXNzYWdlKTtcbn0pO1xuIl19