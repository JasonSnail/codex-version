type FetchOptions = {
  method?: 'GET' | 'POST'
  body?: unknown
  signal?: AbortSignal
}

export type ElsaEnv = {
  baseUrl: string
  apiKey: string
  apiKeyHeader: string
}

export const getElsaEnv = (): ElsaEnv => {
  const baseUrl = import.meta.env.VITE_ELSA_BASE_URL || 'http://localhost:14000/elsa/api'
  const apiKey = import.meta.env.VITE_ELSA_API_KEY || ''
  const apiKeyHeader = import.meta.env.VITE_ELSA_API_KEY_HEADER || 'X-Api-Key'
  return { baseUrl, apiKey, apiKeyHeader }
}

const buildQueryString = (params: Record<string, string | number | boolean | null | undefined>) => {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value!.toString())}`)
  if (!entries.length) return ''
  return `?${entries.join('&')}`
}

export const elsaFetch = async <T>(path: string, options: FetchOptions = {}): Promise<T> => {
  const { baseUrl, apiKey, apiKeyHeader } = getElsaEnv()
  const url = `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
  const headers: Record<string, string> = {
    Accept: 'application/json'
  }

  if (options.method === 'POST') {
    headers['Content-Type'] = 'application/json'
  }

  if (apiKey) {
    headers[apiKeyHeader] = apiKey
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Elsa API ${response.status}: ${text || response.statusText}`)
  }

  return response.json() as Promise<T>
}

export const listJournal = (workflowInstanceId: string) =>
  elsaFetch('/workflow-instances/' + workflowInstanceId + '/journal?skip=0&take=200')

export const getExecutionState = (workflowInstanceId: string) =>
  elsaFetch('/workflow-instances/' + workflowInstanceId + '/execution-state')

export const getWorkflowInstance = (workflowInstanceId: string) =>
  elsaFetch('/workflow-instances/' + workflowInstanceId)

export const listActivityExecutionSummaries = (workflowInstanceId: string) =>
  elsaFetch(`/activity-execution-summaries/list${buildQueryString({ workflowInstanceId })}`)

export const listActivityExecutionReport = (workflowInstanceId: string) =>
  elsaFetch('/activity-executions/report', {
    method: 'POST',
    body: { workflowInstanceId }
  })

export const listActivityExecutions = (workflowInstanceId: string, activityNodeId: string) =>
  elsaFetch(`/activity-executions/list${buildQueryString({ workflowInstanceId, activityNodeId })}`)

export const listWorkflowInstances = (skip = 0, take = 50) =>
  elsaFetch(`/workflow-instances${buildQueryString({ skip, take })}`)
