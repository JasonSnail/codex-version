# Elsa Workflow Instance Visualization (Dynamic-first, Static-overlay Later)

## Goals
- Visualize the actual execution path for a single workflow instance.
- Start with dynamic-only trace for MVP; add static workflow graph overlay later.

## Scope
In scope:
- React app that calls Elsa API directly (demo) to render a graph for one instance.
- Heuristic edges in Phase 1 (not 100% accurate for parallel/loop).
- Static overlay mapping in Phase 2.

Out of scope:
- Multi-instance heatmaps.
- 100% accurate transitions (requires instrumentation).
- Production auth hardening.

## Assumptions
- Elsa 3.5.3, API base `http://localhost:14000/elsa/api`
- Auth uses `UseAdminApiKey` (header name from `WWW-Authenticate`).
- CORS allows React dev server (already `AllowAnyOrigin`).

## Data Sources (Elsa API)
Dynamic:
- GET `/workflow-instances/{id}`
- GET `/workflow-instances/{id}/journal?skip=0&take=...`
- GET `/workflow-instances/{id}/execution-state`
- POST `/activity-executions/report`
- POST `/activity-execution-summaries/list`
- POST `/activity-executions/list` (drill-down)
- GET `/activity-executions/{id}`

Static (Phase 2):
- GET `/workflow-definitions/by-definition-id/{definitionId}?versionOptions=...`
- GET `/workflow-definitions/subgraph/{id}`
- Fallback: parse `WorkflowDefinition.Root` if subgraph is not usable.

## UI/UX
- Instance input + reload
- Graph canvas (React Flow)
- Timeline list (journal)
- Node detail panel (executions, outputs, exception)

## Data Model (frontend)
- Node: id (ActivityNodeId), type, name, status, startedAt, completedAt, counts, isBlocked, isFaulted, outputsSummary
- Edge: id, source, target, confidence (high/low), label (optional)
- TimelineEntry: timestamp, eventName, activityNodeId, data (raw json)

## Phase 1: Dynamic-only Trace Graph (MVP)
1. Fetch instance, journal, execution-state, execution summaries.
2. Build nodes from activity execution summaries.
3. Build edges using heuristic:
   - Sort executions by startedAt.
   - For each execution E, find previous execution P with completedAt <= E.startedAt
     and minimal time gap; link P -> E as low-confidence.
   - If multiple candidates (parallel), allow multiple edges but mark low-confidence.
4. Highlight nodes based on status (running/blocked/faulted/completed).
5. Timeline panel and node detail panel.

## Phase 2: Static Graph Overlay
1. Fetch workflow definition (by definitionId or id).
2. Fetch subgraph and build static nodes/edges.
3. Map dynamic data to static nodes by ActivityNodeId.
4. Recompute edge highlighting only among static edges:
   - If both nodes executed, and timing fits, mark edge as traversed.
   - Keep low-confidence style when ambiguous.

## Phase 3 (Optional): Accurate Transitions
- Add server-side transition events to emit from->to/outcome with executionId/branchId.
- Provide `/visualization/{instanceId}` API to serve `{nodes, edges, transitions}`.

## Auth (Demo)
- React app passes admin API key in a header.
- Determine header name by calling any protected endpoint and reading
  `WWW-Authenticate` response header `KeyName` value.
- Store base URL and key in `.env` (demo only).

## Risks and Mitigations
- Heuristic edges can be wrong in parallel/loop cases.
  - Mitigation: mark low-confidence edges, provide timeline for verification.
- Subgraph endpoint id ambiguity.
  - Mitigation: test definitionId vs versionId; fallback to Root parsing.
- Missing/limited log data depending on persistence strategy.
  - Mitigation: rely on execution-state + summaries; document gaps.

## Open Questions
- Confirm correct API key header name and key value.
- Confirm subgraph endpoint parameter (definitionId vs versionId).
- Confirm which journal events include ActivityNodeId and event names.
- Decide how many records to fetch for long-running instances (pagination).

## Implementation Plan
Phase 0 (0.5-1d): API spike
- Verify API endpoints and auth header.
- Capture sample instance id via `/demo/run`.

Phase 1 (1-2d): Frontend MVP
- Create React app with React Flow.
- Implement API client and data fetching.
- Render dynamic-only graph + timeline + node details.

Phase 2 (1-2d): Static overlay
- Fetch definition/subgraph and render full workflow graph.
- Overlay dynamic state; refine edge highlighting.

Phase 3 (optional, 2-5d): Accurate transitions
- Add server-side instrumentation and a unified visualization endpoint.

Success Criteria:
- Given a workflowInstanceId, the UI shows executed nodes and current status
  within 2-3 seconds and highlights likely traversal path.
