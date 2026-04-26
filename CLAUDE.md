# wagex-backend (NestJS)

## graphify Knowledge Graph

Graph built from `wagex-backend/src` — 717 nodes, 786 edges, 125 communities.

**Open:** `../graphify-out/graph.html` in a browser to explore visually.

**Before answering questions about how services connect, data flow, or dependencies, query the graph:**

```
/graphify query "<your question>"
```

**Key architectural facts (from graph):**
- `PoliciesService.getEffectivePolicy()` is called by: `AttendanceExternalService`, `AttendanceProcessingService`, `AttendancePortalService`, `AttendanceManualService`, and `SalaryEngineService` — it is the central policy resolver for the entire backend
- `SalaryEngineService.calculatePreview()` pulls policy + active deductions simultaneously — salary previews already reflect advance repayments
- Overtime (`overtime-calculator.ts`) runs on a separate path from salary components, both merge into the final salary
- `SalaryAutomationService.handleAutoDraftGeneration()` calls `getDefaultPolicy()` then `bulkGenerate()` separately — a policy change between those two calls could cause inconsistency in auto-drafts
- God nodes: `LeavesService` (17 edges), `AttendanceManualController` (13), `PoliciesService` (13), `TemplatesService` (12)
