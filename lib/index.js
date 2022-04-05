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
 * We expect to see something like "[item1|item2]". GitHub will return '' if the
 * input is not defined, so treating the empty string like undefined.
 */
function renderListInput(rawInput) {
    rawInput.replace(',', '|');
    return rawInput === '' ? undefined : rawInput.replace(/\[|\]/gi, '').split('|');
}
function toNumber(list) {
    return list.map((i) => Number(i));
}
run().catch(error => {
    core.setFailed(error.message);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0RBQXNDO0FBQ3RDLDJEQUE4RDtBQUU5RCxLQUFLLFVBQVUsR0FBRztJQUNoQixJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUU1QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQzVDLE1BQU0saUJBQWlCLEdBQVcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ25FLE1BQU0sdUJBQXVCLEdBQVcsSUFBSSxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0lBQy9FLE1BQU0sZUFBZSxHQUFXLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7SUFFL0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBQzlELE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztJQUMxRSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRXhGLE1BQU0sTUFBTSxHQUFHLElBQUksMkNBQXVCLENBQUMsS0FBSyxFQUFFO1FBQ2hELGNBQWMsRUFBRSxlQUFlLENBQUMsaUJBQWlCLENBQUM7UUFDbEQsb0JBQW9CLEVBQUUsZUFBZSxDQUFDLHVCQUF1QixDQUFDO1FBQzlELFlBQVksRUFBRSxlQUFlLENBQUMsZUFBZSxDQUFDO1FBQzlDLFdBQVcsRUFBRSxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7S0FDeEUsQ0FBQyxDQUFDO0lBRUgsTUFBTSxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDdkIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7QUFDN0MsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxTQUFTLGVBQWUsQ0FBQyxRQUFnQjtJQUN2QyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMzQixPQUFPLFFBQVEsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2xGLENBQUM7QUFFRCxTQUFTLFFBQVEsQ0FBQyxJQUFjO0lBQzlCLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEMsQ0FBQztBQUVELEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRTtJQUNsQixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNoQyxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNvcmUgZnJvbSAnQGFjdGlvbnMvY29yZSc7XG5pbXBvcnQgeyBQdWxsUmVxdWVzdExhYmVsTWFuYWdlciB9IGZyb20gJy4vY29weS1pc3N1ZS1sYWJlbHMnO1xuXG5hc3luYyBmdW5jdGlvbiBydW4oKSB7XG4gIGNvcmUuc2V0T3V0cHV0KCdsYWJlbGVkJywgZmFsc2UudG9TdHJpbmcoKSk7XG5cbiAgY29uc3QgdG9rZW4gPSBjb3JlLmdldElucHV0KCdnaXRodWItdG9rZW4nKTtcbiAgY29uc3QgcmF3UHJpb3JpdHlMYWJlbHM6IHN0cmluZyA9IGNvcmUuZ2V0SW5wdXQoJ3ByaW9yaXR5LWxhYmVscycpO1xuICBjb25zdCByYXdDbGFzc2lmaWNhdGlvbkxhYmxlczogc3RyaW5nID0gY29yZS5nZXRJbnB1dCgnY2xhc3NpZmljYXRpb24tbGFiZWxzJyk7XG4gIGNvbnN0IHJhd0VmZm9ydExhYmVsczogc3RyaW5nID0gY29yZS5nZXRJbnB1dCgnZWZmb3J0LWxhYmVscycpO1xuXG4gIGNvbnNvbGUubG9nKCdwcmlvcml0eSBsYWJlbHMgZnJvbSBpbnB1dHMnLCByYXdQcmlvcml0eUxhYmVscyk7XG4gIGNvbnNvbGUubG9nKCdjbGFzc2lmaWNhdGlvbiBsYWJlc2wgZnJvbSBpbnB1dHMnLCByYXdDbGFzc2lmaWNhdGlvbkxhYmxlcyk7XG4gIGNvbnNvbGUubG9nKCdwdWxsIG51bWJlcnMnLCB0b051bWJlcihyZW5kZXJMaXN0SW5wdXQoY29yZS5nZXRJbnB1dCgnb24tcHVsbHMnKSkgPz8gW10pKTtcblxuICBjb25zdCBjb3BpZXIgPSBuZXcgUHVsbFJlcXVlc3RMYWJlbE1hbmFnZXIodG9rZW4sIHtcbiAgICBwcmlvcml0eUxhYmVsczogcmVuZGVyTGlzdElucHV0KHJhd1ByaW9yaXR5TGFiZWxzKSxcbiAgICBjbGFzc2lmaWNhdGlvbkxhYmVsczogcmVuZGVyTGlzdElucHV0KHJhd0NsYXNzaWZpY2F0aW9uTGFibGVzKSxcbiAgICBlZmZvcnRMYWJlbHM6IHJlbmRlckxpc3RJbnB1dChyYXdFZmZvcnRMYWJlbHMpLFxuICAgIHB1bGxOdW1iZXJzOiB0b051bWJlcihyZW5kZXJMaXN0SW5wdXQoY29yZS5nZXRJbnB1dCgnb24tcHVsbHMnKSkgPz8gW10pLFxuICB9KTtcblxuICBhd2FpdCBjb3BpZXIuZG9QdWxscygpO1xuICBjb3JlLnNldE91dHB1dCgnbGFiZWxlZCcsIHRydWUudG9TdHJpbmcoKSk7XG59XG5cbi8qKlxuICogUmVuZGVycyBhIFR5cGVTY3JpcHQgbGlzdCBiYXNlZCBvbiB3aGF0IHdlIGV4cGVjdCB0aGUgbGlzdCB0byBsb29rIGxpa2UgaW4geWFtbC5cbiAqIFdlIGV4cGVjdCB0byBzZWUgc29tZXRoaW5nIGxpa2UgXCJbaXRlbTF8aXRlbTJdXCIuIEdpdEh1YiB3aWxsIHJldHVybiAnJyBpZiB0aGVcbiAqIGlucHV0IGlzIG5vdCBkZWZpbmVkLCBzbyB0cmVhdGluZyB0aGUgZW1wdHkgc3RyaW5nIGxpa2UgdW5kZWZpbmVkLlxuICovXG5mdW5jdGlvbiByZW5kZXJMaXN0SW5wdXQocmF3SW5wdXQ6IHN0cmluZyk6IHN0cmluZ1tdIHwgdW5kZWZpbmVkIHtcbiAgcmF3SW5wdXQucmVwbGFjZSgnLCcsICd8Jyk7XG4gIHJldHVybiByYXdJbnB1dCA9PT0gJycgPyB1bmRlZmluZWQgOiByYXdJbnB1dC5yZXBsYWNlKC9cXFt8XFxdL2dpLCAnJykuc3BsaXQoJ3wnKTtcbn1cblxuZnVuY3Rpb24gdG9OdW1iZXIobGlzdDogc3RyaW5nW10pOiBudW1iZXJbXSB7XG4gIHJldHVybiBsaXN0Lm1hcCgoaSkgPT4gTnVtYmVyKGkpKTtcbn1cblxucnVuKCkuY2F0Y2goZXJyb3IgPT4ge1xuICBjb3JlLnNldEZhaWxlZChlcnJvci5tZXNzYWdlKTtcbn0pO1xuIl19