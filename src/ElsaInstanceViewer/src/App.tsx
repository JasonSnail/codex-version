import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactFlow, { Background, Controls, Handle, MiniMap, Position, type Edge, type Node } from 'reactflow'
import 'reactflow/dist/style.css'
import {
  getExecutionState,
  getWorkflowInstance,
  listActivityExecutionReport,
  listActivityExecutionSummaries,
  listActivityExecutions,
  listJournal,
  listWorkflowInstances,
  getElsaEnv
} from './lib/elsa'
import './App.css'

type AnyRecord = Record<string, unknown>

const readProp = <T,>(obj: AnyRecord | null | undefined, keys: string[], fallback?: T): T | undefined => {
  if (!obj) return fallback
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
      return obj[key] as T
    }
  }
  return fallback
}

const readItems = (value: unknown): AnyRecord[] => {
  if (!value) return []
  if (Array.isArray(value)) return value as AnyRecord[]
  if (typeof value === 'object') {
    const record = value as AnyRecord
    const items = readProp<unknown>(record, ['items', 'Items', 'data', 'Data'])
    if (Array.isArray(items)) return items as AnyRecord[]
  }
  return []
}

const parseDate = (value: unknown): Date | null => {
  if (typeof value === 'string') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (value instanceof Date) return value
  return null
}

const formatTime = (value: Date | null): string => {
  if (!value) return 'n/a'
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(value)
}

const TraceNode = ({ data }: { data: AnyRecord }) => {
  const label = typeof data.label === 'string' ? data.label : String(data.label ?? 'Activity')
  const statusLabel =
    typeof data.statusLabel === 'string' ? data.statusLabel : String(data.statusLabel ?? 'Unknown')
  const timeLabel = typeof data.timeLabel === 'string' ? data.timeLabel : String(data.timeLabel ?? 'n/a')
  return (
    <div className={`trace-node status-${data.status ?? 'unknown'}`}>
      <Handle type="target" position={Position.Top} id="target" />
      <div className="trace-node__title">{label}</div>
      <div className="trace-node__meta">
        <span>{statusLabel}</span>
        <span>•</span>
        <span>{timeLabel}</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="source" />
    </div>
  )
}

const NODE_TYPES = { trace: TraceNode }

function App() {
  const [inputId, setInputId] = useState('')
  const [workflowInstanceId, setWorkflowInstanceId] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [instanceSelectValue, setInstanceSelectValue] = useState('')
  const env = getElsaEnv()

  const instanceQuery = useQuery({
    queryKey: ['instance', workflowInstanceId],
    queryFn: () => getWorkflowInstance(workflowInstanceId),
    enabled: Boolean(workflowInstanceId)
  })

  const journalQuery = useQuery({
    queryKey: ['journal', workflowInstanceId],
    queryFn: () => listJournal(workflowInstanceId),
    enabled: Boolean(workflowInstanceId)
  })

  const executionStateQuery = useQuery({
    queryKey: ['execution-state', workflowInstanceId],
    queryFn: () => getExecutionState(workflowInstanceId),
    enabled: Boolean(workflowInstanceId)
  })

  const summariesQuery = useQuery({
    queryKey: ['execution-summaries', workflowInstanceId],
    queryFn: () => listActivityExecutionSummaries(workflowInstanceId),
    enabled: Boolean(workflowInstanceId)
  })

  const reportQuery = useQuery({
    queryKey: ['execution-report', workflowInstanceId],
    queryFn: () => listActivityExecutionReport(workflowInstanceId),
    enabled: Boolean(workflowInstanceId)
  })

  const nodeExecutionsQuery = useQuery({
    queryKey: ['activity-executions', workflowInstanceId, selectedNodeId],
    queryFn: () => listActivityExecutions(workflowInstanceId, selectedNodeId ?? ''),
    enabled: Boolean(workflowInstanceId && selectedNodeId)
  })

  const workflowInstancesQuery = useQuery({
    queryKey: ['workflow-instances'],
    queryFn: () => listWorkflowInstances(),
    staleTime: 1000 * 60
  })

  const instanceOptions = useMemo(() => {
    const items = readItems(workflowInstancesQuery.data)
    return items
      .map((item) => {
        const id = readProp<string>(item, ['id', 'Id'])
        const name =
          readProp<string>(item, ['name', 'Name']) ??
          readProp<string>(item, ['definitionId', 'DefinitionId']) ??
          'Workflow'
        const status = readProp<string>(item, ['status', 'Status']) ?? 'Unknown'
        const updatedAt = parseDate(readProp<string>(item, ['updatedAt', 'UpdatedAt']))
        const createdAt = parseDate(readProp<string>(item, ['createdAt', 'CreatedAt']))
        const timestampLabel = updatedAt ? formatTime(updatedAt) : createdAt ? formatTime(createdAt) : ''
        const label = `${name} (${status}${timestampLabel ? ` · ${timestampLabel}` : ''}) - ${id}`
        return { id: id ?? '', label }
      })
      .filter((option) => option.id)
  }, [workflowInstancesQuery.data])

  const graph = useMemo(() => {
    const summaries = readItems(summariesQuery.data)
    const stats = readItems(readProp(reportQuery.data as AnyRecord, ['stats', 'Stats'], []))
    const statsByNodeId = new Map<string, AnyRecord>()

    stats.forEach((stat) => {
      const nodeId = readProp<string>(stat, ['activityNodeId', 'ActivityNodeId'])
      if (nodeId) statsByNodeId.set(nodeId, stat)
    })

    const normalized = summaries.map((summary, index) => {
      const nodeId = readProp<string>(summary, ['activityNodeId', 'ActivityNodeId']) ?? `node-${index}`
      const name =
        readProp<string>(summary, ['activityName', 'ActivityName']) ||
        readProp<string>(summary, ['activityType', 'ActivityType']) ||
        'Activity'
      const startedAt = parseDate(readProp<string>(summary, ['startedAt', 'StartedAt']))
      const completedAt = parseDate(readProp<string>(summary, ['completedAt', 'CompletedAt']))
      const statusValue = readProp<string>(summary, ['status', 'Status'])
      const stat = statsByNodeId.get(nodeId)
      const isBlocked = readProp<boolean>(stat ?? summary, ['isBlocked', 'IsBlocked']) ?? false
      const isFaulted = readProp<boolean>(stat ?? summary, ['isFaulted', 'IsFaulted']) ?? false

      let status = 'unknown'
      if (isFaulted) status = 'faulted'
      else if (isBlocked) status = 'blocked'
      else if (statusValue) status = statusValue.toLowerCase()
      else if (completedAt) status = 'completed'
      else if (startedAt) status = 'running'

      const statusLabel =
        status === 'faulted'
          ? 'Faulted'
          : status === 'blocked'
            ? 'Blocked'
            : status === 'completed'
              ? 'Completed'
              : status === 'running'
                ? 'Running'
                : 'Unknown'

      return {
        nodeId,
        name,
        startedAt,
        completedAt,
        status,
        statusLabel,
        summary,
        index
      }
    })

    const sorted = [...normalized].sort((a, b) => {
      const timeA = a.startedAt?.getTime() ?? a.completedAt?.getTime() ?? a.index
      const timeB = b.startedAt?.getTime() ?? b.completedAt?.getTime() ?? b.index
      return timeA - timeB
    })

    const laneCount = 3
    const nodes: Node[] = sorted.map((item, index) => {
      const startedLabel = formatTime(item.startedAt)
      const completedLabel = formatTime(item.completedAt)
      const timeLabel = item.completedAt ? `${startedLabel} → ${completedLabel}` : startedLabel
      return {
        id: item.nodeId,
        type: 'trace',
        position: {
          x: (index % laneCount) * 260,
          y: Math.floor(index / laneCount) * 150
        },
        data: {
          label: item.name,
          status: item.status,
          statusLabel: item.statusLabel,
          timeLabel,
          summary: item.summary
        }
      }
    })

    const edges: Edge[] = []
    const edgeIds = new Set<string>()

    for (let i = 1; i < sorted.length; i += 1) {
      const current = sorted[i]
      const currentStart = current.startedAt?.getTime() ?? current.completedAt?.getTime()
      let candidateIndex = i - 1
      let confidence: 'high' | 'low' | 'unknown' = 'unknown'

      if (currentStart) {
        let bestGap = Number.POSITIVE_INFINITY
        for (let j = 0; j < i; j += 1) {
          const prev = sorted[j]
          const prevTime = prev.completedAt?.getTime() ?? prev.startedAt?.getTime()
          if (!prevTime) continue
          const gap = currentStart - prevTime
          if (gap >= 0 && gap < bestGap) {
            bestGap = gap
            candidateIndex = j
            confidence = 'high'
          }
        }
      }

      if (confidence === 'unknown') confidence = 'low'
      const source = sorted[candidateIndex]?.nodeId
      const target = current.nodeId
      if (!source || source === target) continue

      let id = `edge-${source}-${target}`
      let counter = 1
      while (edgeIds.has(id)) {
        counter += 1
        id = `edge-${source}-${target}-${counter}`
      }
      edgeIds.add(id)
      edges.push({
        id,
        source,
        target,
        type: 'smoothstep',
        sourceHandle: 'source',
        targetHandle: 'target',
        className: confidence === 'high' ? 'edge-high' : confidence === 'low' ? 'edge-low' : 'edge-unknown'
      })
    }

    const nodeMetaById = new Map(sorted.map((item) => [item.nodeId, item]))
    return { nodes, edges, nodeMetaById }
  }, [summariesQuery.data, reportQuery.data])

  const journalItems = useMemo(() => {
    const items = readItems(journalQuery.data)
    const normalized = items.map((item, index) => {
      const eventName =
        readProp<string>(item, ['eventName', 'EventName']) ||
        readProp<string>(item, ['name', 'Name']) ||
        'Event'
      const timestamp =
        parseDate(readProp<string>(item, ['timestamp', 'Timestamp'])) ||
        parseDate(readProp<string>(item, ['createdAt', 'CreatedAt'])) ||
        parseDate(readProp<string>(item, ['executedAt', 'ExecutedAt']))
      const nodeId = readProp<string>(item, ['activityNodeId', 'ActivityNodeId'])
      const activityMeta = nodeId ? graph.nodeMetaById.get(nodeId) : null
      const activityName =
        activityMeta?.name ??
        readProp<string>(activityMeta?.summary ?? item, ['activityName', 'ActivityName']) ??
        readProp<string>(activityMeta?.summary ?? item, ['activityType', 'ActivityType']) ??
        'Activity'
      const activityType =
        readProp<string>(activityMeta?.summary ?? item, ['activityType', 'ActivityType']) ?? 'Unknown'
      const activityStatus = activityMeta?.status ?? readProp<string>(activityMeta?.summary ?? item, ['status', 'Status'])
      const activityStatusLabel =
        activityMeta?.statusLabel ??
        (activityStatus ? `${activityStatus.charAt(0).toUpperCase()}${activityStatus.slice(1)}` : 'Unknown')
      return {
        eventName,
        timestamp,
        nodeId,
        raw: item,
        index,
        activityName,
        activityType,
        activityStatus,
        activityStatusLabel
      }
    })

    return normalized.sort((a, b) => {
      const timeA = a.timestamp?.getTime() ?? a.index
      const timeB = b.timestamp?.getTime() ?? b.index
      return timeB - timeA
    })
  }, [journalQuery.data, graph.nodeMetaById])

  const selectedSummary = selectedNodeId ? graph.nodeMetaById.get(selectedNodeId) : null

  const loading =
    instanceQuery.isLoading ||
    journalQuery.isLoading ||
    summariesQuery.isLoading ||
    reportQuery.isLoading ||
    executionStateQuery.isLoading

  const error =
    instanceQuery.error ||
    journalQuery.error ||
    summariesQuery.error ||
    reportQuery.error ||
    executionStateQuery.error

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-row">
          <div className="title-block">
            <div className="title">Elsa Instance Trace Viewer</div>
            <div className="subtitle">Dynamic-first workflow visualization (heuristic edges)</div>
          </div>
          <div className="meta">
            <span className="pill">Base URL: {env.baseUrl}</span>
            <span className="pill">Key Header: {env.apiKeyHeader}</span>
          </div>
        </div>
        <div className="controls">
          <div className="input-group">
            <label htmlFor="instanceSelect">Recent workflow instances</label>
            <select
              id="instanceSelect"
              value={instanceSelectValue}
              onChange={(event) => {
                const value = event.target.value
                setInstanceSelectValue(value)
                setInputId(value)
              }}
              disabled={workflowInstancesQuery.isFetching || workflowInstancesQuery.isError}
            >
              <option value="" disabled>
                {workflowInstancesQuery.isFetching
                  ? 'Loading instances...'
                  : instanceOptions.length
                    ? 'Select an instance'
                    : workflowInstancesQuery.isError
                      ? 'Failed to load instances'
                      : 'No instances available'}
              </option>
              {instanceOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="instanceId">Workflow Instance ID</label>
            <input
              id="instanceId"
              value={inputId}
              onChange={(event) => {
                setInputId(event.target.value)
                setInstanceSelectValue('')
              }}
              placeholder="e.g. 01J... or GUID"
            />
          </div>
          <button
            className="btn primary"
            onClick={() => {
              setWorkflowInstanceId(inputId.trim())
              setSelectedNodeId(null)
            }}
            disabled={!inputId.trim()}
          >
            Load Instance
          </button>
          <button className="btn ghost" onClick={() => setSelectedNodeId(null)}>
            Clear Selection
          </button>
        </div>
        <div className="status-line">
          <span>
            Status:{' '}
            <strong>
              {loading
                ? 'Loading...'
                : error
                  ? 'Error'
                  : workflowInstanceId
                    ? 'Ready'
                    : 'Idle'}
            </strong>
          </span>
          {error ? <span>{(error as Error).message}</span> : null}
          {executionStateQuery.data ? <span>Execution state loaded</span> : null}
        </div>
      </header>

      <main className="app-main">
        <section className="panel graph-panel">
          <h2>Execution Graph</h2>
          {!workflowInstanceId ? (
            <div className="empty">Enter a workflow instance ID to load the trace.</div>
          ) : (
            <ReactFlow
              nodes={graph.nodes}
              edges={graph.edges}
              nodeTypes={NODE_TYPES}
              fitView
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            >
              <Background color="rgba(255,255,255,0.08)" gap={20} />
              <MiniMap pannable zoomable />
              <Controls />
            </ReactFlow>
          )}
        </section>

        <section className="panel">
          <h2>Timeline</h2>
          {journalItems.length === 0 ? (
            <div className="empty">No journal entries loaded yet.</div>
          ) : (
            <div className="timeline">
              {journalItems.map((entry, index) => (
                <div
                  className="timeline-item"
                  key={`${entry.eventName}-${index}`}
                  onClick={() => entry.nodeId && setSelectedNodeId(entry.nodeId)}
                >
                  <span className="time">{formatTime(entry.timestamp)}</span>
                  <span className="event">{entry.eventName}</span>
                  {entry.nodeId ? <span className="time">Node: {entry.nodeId}</span> : null}
                  {entry.nodeId ? (
                    <div className="timeline-item__activity">
                      <span>Activity: {entry.activityName}</span>
                      <span>Type: {entry.activityType}</span>
                      <span>Status: {entry.activityStatusLabel}</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Node Detail</h2>
          <div className="detail">
            {!selectedNodeId ? (
              <div className="empty">Click a node to inspect execution details.</div>
            ) : (
              <>
                <div className="status-line">
                  <span>
                    Selected: <strong>{selectedNodeId}</strong>
                  </span>
                  {selectedSummary ? (
                    <>
                      <span>Activity: {selectedSummary.name}</span>
                      <span>Status: {selectedSummary.statusLabel}</span>
                      <span>Type: {readProp<string>(selectedSummary.summary ?? {}, ['activityType', 'ActivityType']) ?? 'Unknown'}</span>
                    </>
                  ) : null}
                </div>
                <pre>{JSON.stringify(selectedSummary?.summary ?? {}, null, 2)}</pre>
                <pre>{JSON.stringify(nodeExecutionsQuery.data ?? {}, null, 2)}</pre>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
