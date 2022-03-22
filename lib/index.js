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
    const copier = new copy_issue_labels_1.PullRequestLabelManager(token);
    await copier.copyLabelsFromReferencedIssues();
}
run().catch(error => {
    core.setFailed(error.message);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0RBQXNDO0FBQ3RDLDJEQUE4RDtBQUU5RCxLQUFLLFVBQVUsR0FBRztJQUNoQixJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUU1QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQzVDLE1BQU0sTUFBTSxHQUFHLElBQUksMkNBQXVCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbEQsTUFBTSxNQUFNLENBQUMsOEJBQThCLEVBQUUsQ0FBQztBQUNoRCxDQUFDO0FBRUQsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFO0lBQ2xCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY29yZSBmcm9tICdAYWN0aW9ucy9jb3JlJztcbmltcG9ydCB7IFB1bGxSZXF1ZXN0TGFiZWxNYW5hZ2VyIH0gZnJvbSAnLi9jb3B5LWlzc3VlLWxhYmVscyc7XG5cbmFzeW5jIGZ1bmN0aW9uIHJ1bigpIHtcbiAgY29yZS5zZXRPdXRwdXQoJ2xhYmVsZWQnLCBmYWxzZS50b1N0cmluZygpKTtcblxuICBjb25zdCB0b2tlbiA9IGNvcmUuZ2V0SW5wdXQoJ2dpdGh1Yi10b2tlbicpO1xuICBjb25zdCBjb3BpZXIgPSBuZXcgUHVsbFJlcXVlc3RMYWJlbE1hbmFnZXIodG9rZW4pO1xuICBhd2FpdCBjb3BpZXIuY29weUxhYmVsc0Zyb21SZWZlcmVuY2VkSXNzdWVzKCk7XG59XG5cbnJ1bigpLmNhdGNoKGVycm9yID0+IHtcbiAgY29yZS5zZXRGYWlsZWQoZXJyb3IubWVzc2FnZSk7XG59KTtcbiJdfQ==