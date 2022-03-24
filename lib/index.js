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
    const rawPriorityLabels = core.getInput('priority-labels');
    const rawClassificationLables = core.getInput('classification-labels');
    const rawEffortLabels = core.getInput('effort-labels');
    console.log('priority labels from inputs', rawPriorityLabels);
    console.log('classification labesl from inputs', rawClassificationLables);
    const copier = new copy_issue_labels_1.PullRequestLabelManager(token, {
        priorityLabels: renderListInput(rawPriorityLabels),
        classificationLabels: renderListInput(rawClassificationLables),
        effortLabels: renderListInput(rawEffortLabels),
    });
    await copier.copyLabelsFromReferencedIssues();
    core.setOutput('labeled', true.toString());
}
/**
 * Renders a TypeScript list based on what we expect the list to look like in yaml.
 * We expect to see something like "[item1|item2]". GitHub will return '' if the
 * input is not defined, so treating the empty string like undefined.
 */
function renderListInput(rawInput) {
    return rawInput === '' ? undefined : rawInput.replace(/\[|\]/gi, '').split('|');
}
run().catch(error => {
    core.setFailed(error.message);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0RBQXNDO0FBQ3RDLDJEQUE4RDtBQUU5RCxLQUFLLFVBQVUsR0FBRztJQUNoQixJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUU1QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQzVDLE1BQU0saUJBQWlCLEdBQVcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ25FLE1BQU0sdUJBQXVCLEdBQVcsSUFBSSxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0lBQy9FLE1BQU0sZUFBZSxHQUFXLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7SUFFL0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBQzlELE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztJQUMxRSxNQUFNLE1BQU0sR0FBRyxJQUFJLDJDQUF1QixDQUFDLEtBQUssRUFBRTtRQUNoRCxjQUFjLEVBQUUsZUFBZSxDQUFDLGlCQUFpQixDQUFDO1FBQ2xELG9CQUFvQixFQUFFLGVBQWUsQ0FBQyx1QkFBdUIsQ0FBQztRQUM5RCxZQUFZLEVBQUUsZUFBZSxDQUFDLGVBQWUsQ0FBQztLQUMvQyxDQUFDLENBQUM7SUFDSCxNQUFNLE1BQU0sQ0FBQyw4QkFBOEIsRUFBRSxDQUFDO0lBQzlDLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0FBQzdDLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBUyxlQUFlLENBQUMsUUFBZ0I7SUFDdkMsT0FBTyxRQUFRLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNsRixDQUFDO0FBRUQsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFO0lBQ2xCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY29yZSBmcm9tICdAYWN0aW9ucy9jb3JlJztcbmltcG9ydCB7IFB1bGxSZXF1ZXN0TGFiZWxNYW5hZ2VyIH0gZnJvbSAnLi9jb3B5LWlzc3VlLWxhYmVscyc7XG5cbmFzeW5jIGZ1bmN0aW9uIHJ1bigpIHtcbiAgY29yZS5zZXRPdXRwdXQoJ2xhYmVsZWQnLCBmYWxzZS50b1N0cmluZygpKTtcblxuICBjb25zdCB0b2tlbiA9IGNvcmUuZ2V0SW5wdXQoJ2dpdGh1Yi10b2tlbicpO1xuICBjb25zdCByYXdQcmlvcml0eUxhYmVsczogc3RyaW5nID0gY29yZS5nZXRJbnB1dCgncHJpb3JpdHktbGFiZWxzJyk7XG4gIGNvbnN0IHJhd0NsYXNzaWZpY2F0aW9uTGFibGVzOiBzdHJpbmcgPSBjb3JlLmdldElucHV0KCdjbGFzc2lmaWNhdGlvbi1sYWJlbHMnKTtcbiAgY29uc3QgcmF3RWZmb3J0TGFiZWxzOiBzdHJpbmcgPSBjb3JlLmdldElucHV0KCdlZmZvcnQtbGFiZWxzJyk7XG5cbiAgY29uc29sZS5sb2coJ3ByaW9yaXR5IGxhYmVscyBmcm9tIGlucHV0cycsIHJhd1ByaW9yaXR5TGFiZWxzKTtcbiAgY29uc29sZS5sb2coJ2NsYXNzaWZpY2F0aW9uIGxhYmVzbCBmcm9tIGlucHV0cycsIHJhd0NsYXNzaWZpY2F0aW9uTGFibGVzKTtcbiAgY29uc3QgY29waWVyID0gbmV3IFB1bGxSZXF1ZXN0TGFiZWxNYW5hZ2VyKHRva2VuLCB7XG4gICAgcHJpb3JpdHlMYWJlbHM6IHJlbmRlckxpc3RJbnB1dChyYXdQcmlvcml0eUxhYmVscyksXG4gICAgY2xhc3NpZmljYXRpb25MYWJlbHM6IHJlbmRlckxpc3RJbnB1dChyYXdDbGFzc2lmaWNhdGlvbkxhYmxlcyksXG4gICAgZWZmb3J0TGFiZWxzOiByZW5kZXJMaXN0SW5wdXQocmF3RWZmb3J0TGFiZWxzKSxcbiAgfSk7XG4gIGF3YWl0IGNvcGllci5jb3B5TGFiZWxzRnJvbVJlZmVyZW5jZWRJc3N1ZXMoKTtcbiAgY29yZS5zZXRPdXRwdXQoJ2xhYmVsZWQnLCB0cnVlLnRvU3RyaW5nKCkpO1xufVxuXG4vKipcbiAqIFJlbmRlcnMgYSBUeXBlU2NyaXB0IGxpc3QgYmFzZWQgb24gd2hhdCB3ZSBleHBlY3QgdGhlIGxpc3QgdG8gbG9vayBsaWtlIGluIHlhbWwuXG4gKiBXZSBleHBlY3QgdG8gc2VlIHNvbWV0aGluZyBsaWtlIFwiW2l0ZW0xfGl0ZW0yXVwiLiBHaXRIdWIgd2lsbCByZXR1cm4gJycgaWYgdGhlXG4gKiBpbnB1dCBpcyBub3QgZGVmaW5lZCwgc28gdHJlYXRpbmcgdGhlIGVtcHR5IHN0cmluZyBsaWtlIHVuZGVmaW5lZC5cbiAqL1xuZnVuY3Rpb24gcmVuZGVyTGlzdElucHV0KHJhd0lucHV0OiBzdHJpbmcpOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCB7XG4gIHJldHVybiByYXdJbnB1dCA9PT0gJycgPyB1bmRlZmluZWQgOiByYXdJbnB1dC5yZXBsYWNlKC9cXFt8XFxdL2dpLCAnJykuc3BsaXQoJ3wnKTtcbn1cblxucnVuKCkuY2F0Y2goZXJyb3IgPT4ge1xuICBjb3JlLnNldEZhaWxlZChlcnJvci5tZXNzYWdlKTtcbn0pO1xuIl19