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
    console.log(core.getInput('on-pulls'), renderListInput(core.getInput('on-pulls')));
    console.log('pull numbers', toNumber(renderListInput(core.getInput('on-pulls')) ?? []));
    const copier = new copy_issue_labels_1.PullRequestLabelManager(token, {
        priorityLabels: renderListInput(rawPriorityLabels),
        classificationLabels: renderListInput(rawClassificationLables),
        effortLabels: renderListInput(rawEffortLabels),
        pullNumbers: toNumber(renderListInput(core.getInput('on-pulls')) ?? []),
    });
    await copier.doPulls();
    core.setOutput('labeled', true.toString());
}
/**
 * Renders a TypeScript list based on what we expect the list to look like in yaml.
 * We expect to see something like "[item1,item2]". GitHub will return '' if the
 * input is not defined, so treating the empty string like undefined.
 */
function renderListInput(rawInput) {
    return (rawInput === '' || rawInput === '[]') ? undefined : rawInput.replace(/\[|\]/gi, '').split(',');
}
function toNumber(list) {
    return list.map((i) => Number(i));
}
run().catch(error => {
    core.setFailed(error.message);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0RBQXNDO0FBQ3RDLDJEQUE4RDtBQUU5RCxLQUFLLFVBQVUsR0FBRztJQUNoQixJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUU1QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQzVDLE1BQU0saUJBQWlCLEdBQVcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ25FLE1BQU0sdUJBQXVCLEdBQVcsSUFBSSxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0lBQy9FLE1BQU0sZUFBZSxHQUFXLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7SUFFL0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBQzlELE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztJQUMxRSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25GLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFeEYsTUFBTSxNQUFNLEdBQUcsSUFBSSwyQ0FBdUIsQ0FBQyxLQUFLLEVBQUU7UUFDaEQsY0FBYyxFQUFFLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQztRQUNsRCxvQkFBb0IsRUFBRSxlQUFlLENBQUMsdUJBQXVCLENBQUM7UUFDOUQsWUFBWSxFQUFFLGVBQWUsQ0FBQyxlQUFlLENBQUM7UUFDOUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztLQUN4RSxDQUFDLENBQUM7SUFFSCxNQUFNLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN2QixJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztBQUM3QyxDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILFNBQVMsZUFBZSxDQUFDLFFBQWdCO0lBQ3ZDLE9BQU8sQ0FBQyxRQUFRLEtBQUssRUFBRSxJQUFJLFFBQVEsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDekcsQ0FBQztBQUVELFNBQVMsUUFBUSxDQUFDLElBQWM7SUFDOUIsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQyxDQUFDO0FBRUQsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFO0lBQ2xCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY29yZSBmcm9tICdAYWN0aW9ucy9jb3JlJztcbmltcG9ydCB7IFB1bGxSZXF1ZXN0TGFiZWxNYW5hZ2VyIH0gZnJvbSAnLi9jb3B5LWlzc3VlLWxhYmVscyc7XG5cbmFzeW5jIGZ1bmN0aW9uIHJ1bigpIHtcbiAgY29yZS5zZXRPdXRwdXQoJ2xhYmVsZWQnLCBmYWxzZS50b1N0cmluZygpKTtcblxuICBjb25zdCB0b2tlbiA9IGNvcmUuZ2V0SW5wdXQoJ2dpdGh1Yi10b2tlbicpO1xuICBjb25zdCByYXdQcmlvcml0eUxhYmVsczogc3RyaW5nID0gY29yZS5nZXRJbnB1dCgncHJpb3JpdHktbGFiZWxzJyk7XG4gIGNvbnN0IHJhd0NsYXNzaWZpY2F0aW9uTGFibGVzOiBzdHJpbmcgPSBjb3JlLmdldElucHV0KCdjbGFzc2lmaWNhdGlvbi1sYWJlbHMnKTtcbiAgY29uc3QgcmF3RWZmb3J0TGFiZWxzOiBzdHJpbmcgPSBjb3JlLmdldElucHV0KCdlZmZvcnQtbGFiZWxzJyk7XG5cbiAgY29uc29sZS5sb2coJ3ByaW9yaXR5IGxhYmVscyBmcm9tIGlucHV0cycsIHJhd1ByaW9yaXR5TGFiZWxzKTtcbiAgY29uc29sZS5sb2coJ2NsYXNzaWZpY2F0aW9uIGxhYmVzbCBmcm9tIGlucHV0cycsIHJhd0NsYXNzaWZpY2F0aW9uTGFibGVzKTtcbiAgY29uc29sZS5sb2coY29yZS5nZXRJbnB1dCgnb24tcHVsbHMnKSwgcmVuZGVyTGlzdElucHV0KGNvcmUuZ2V0SW5wdXQoJ29uLXB1bGxzJykpKTtcbiAgY29uc29sZS5sb2coJ3B1bGwgbnVtYmVycycsIHRvTnVtYmVyKHJlbmRlckxpc3RJbnB1dChjb3JlLmdldElucHV0KCdvbi1wdWxscycpKSA/PyBbXSkpO1xuXG4gIGNvbnN0IGNvcGllciA9IG5ldyBQdWxsUmVxdWVzdExhYmVsTWFuYWdlcih0b2tlbiwge1xuICAgIHByaW9yaXR5TGFiZWxzOiByZW5kZXJMaXN0SW5wdXQocmF3UHJpb3JpdHlMYWJlbHMpLFxuICAgIGNsYXNzaWZpY2F0aW9uTGFiZWxzOiByZW5kZXJMaXN0SW5wdXQocmF3Q2xhc3NpZmljYXRpb25MYWJsZXMpLFxuICAgIGVmZm9ydExhYmVsczogcmVuZGVyTGlzdElucHV0KHJhd0VmZm9ydExhYmVscyksXG4gICAgcHVsbE51bWJlcnM6IHRvTnVtYmVyKHJlbmRlckxpc3RJbnB1dChjb3JlLmdldElucHV0KCdvbi1wdWxscycpKSA/PyBbXSksXG4gIH0pO1xuXG4gIGF3YWl0IGNvcGllci5kb1B1bGxzKCk7XG4gIGNvcmUuc2V0T3V0cHV0KCdsYWJlbGVkJywgdHJ1ZS50b1N0cmluZygpKTtcbn1cblxuLyoqXG4gKiBSZW5kZXJzIGEgVHlwZVNjcmlwdCBsaXN0IGJhc2VkIG9uIHdoYXQgd2UgZXhwZWN0IHRoZSBsaXN0IHRvIGxvb2sgbGlrZSBpbiB5YW1sLlxuICogV2UgZXhwZWN0IHRvIHNlZSBzb21ldGhpbmcgbGlrZSBcIltpdGVtMSxpdGVtMl1cIi4gR2l0SHViIHdpbGwgcmV0dXJuICcnIGlmIHRoZVxuICogaW5wdXQgaXMgbm90IGRlZmluZWQsIHNvIHRyZWF0aW5nIHRoZSBlbXB0eSBzdHJpbmcgbGlrZSB1bmRlZmluZWQuXG4gKi9cbmZ1bmN0aW9uIHJlbmRlckxpc3RJbnB1dChyYXdJbnB1dDogc3RyaW5nKTogc3RyaW5nW10gfCB1bmRlZmluZWQge1xuICByZXR1cm4gKHJhd0lucHV0ID09PSAnJyB8fCByYXdJbnB1dCA9PT0gJ1tdJykgPyB1bmRlZmluZWQgOiByYXdJbnB1dC5yZXBsYWNlKC9cXFt8XFxdL2dpLCAnJykuc3BsaXQoJywnKTtcbn1cblxuZnVuY3Rpb24gdG9OdW1iZXIobGlzdDogc3RyaW5nW10pOiBudW1iZXJbXSB7XG4gIHJldHVybiBsaXN0Lm1hcCgoaSkgPT4gTnVtYmVyKGkpKTtcbn1cblxucnVuKCkuY2F0Y2goZXJyb3IgPT4ge1xuICBjb3JlLnNldEZhaWxlZChlcnJvci5tZXNzYWdlKTtcbn0pO1xuIl19