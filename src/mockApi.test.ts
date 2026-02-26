import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {MockAPI} from './mockApi'
import {ValidationError} from './types'
import {MOCK_TASKS} from './mockData'

function makeApi() {
  return new MockAPI(MOCK_TASKS)
}

async function run<T>(promise: Promise<T>): Promise<T> {
  promise.catch(() => {})
  await vi.runAllTimersAsync()
  return promise
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('MockAPI.updateTask', () => {
  it('returns the updated task with the new title', async () => {
    const api = makeApi()
    const result = await run(api.updateTask('task-1', {title: 'New Title'}))

    expect(result.id).toBe('task-1')
    expect(result.title).toBe('New Title')
    expect(result.updatedAt).toBeGreaterThan(0)
  })

  it('persists the update so getTask reflects the change', async () => {
    const api = makeApi()
    await run(api.updateTask('task-1', {title: 'Persisted'}))

    expect(api.getTask('task-1')?.title).toBe('Persisted')
  })

  it('rejects with ValidationError when title is empty or whitespace', async () => {
    const api = makeApi()

    await expect(run(api.updateTask('task-1', {title: '   '}))).rejects.toMatchObject({
      messages: ['Title cannot be empty'],
    })
    await expect(run(api.updateTask('task-1', {title: ''}))).rejects.toMatchObject({
      messages: ['Title cannot be empty'],
    })
  })

  it('rejects with ValidationError when task does not exist', async () => {
    const api = makeApi()

    await expect(run(api.updateTask('nonexistent', {title: 'Hi'}))).rejects.toBeInstanceOf(ValidationError)
    await expect(run(api.updateTask('nonexistent', {title: 'Hi'}))).rejects.toMatchObject({
      messages: ['Task not found'],
    })
  })

  it('rejects with a network error on simulated failure (random < 0.1)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const api = makeApi()

    await expect(run(api.updateTask('task-1', {title: 'Whatever'}))).rejects.toMatchObject({
      messages: ['Network error: Unable to save changes'],
    })
  })

  it('does not mutate the stored task when a network error occurs', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const api = makeApi()
    const originalTitle = api.getTask('task-1')?.title

    await run(api.updateTask('task-1', {title: 'Should not stick'})).catch(() => {})

    expect(api.getTask('task-1')?.title).toBe(originalTitle)
  })

  it('updates non-title fields (e.g. status)', async () => {
    const api = makeApi()
    const result = await run(api.updateTask('task-1', {status: 'Completed'}))

    expect(result.status).toBe('Completed')
    expect(api.getTask('task-1')?.status).toBe('Completed')
  })
})

describe('MockAPI.updateTasksBatch', () => {
  it('updates all specified tasks and returns them', async () => {
    const api = makeApi()
    const results = await run(api.updateTasksBatch(['task-1', 'task-2'], {status: 'Completed'}))

    expect(results).toHaveLength(2)
    expect(results.every(t => t.status === 'Completed')).toBe(true)
  })

  it('persists all batch updates in the store', async () => {
    const api = makeApi()
    await run(api.updateTasksBatch(['task-1', 'task-2', 'task-3'], {status: 'Canceled'}))

    expect(api.getTask('task-1')?.status).toBe('Canceled')
    expect(api.getTask('task-2')?.status).toBe('Canceled')
    expect(api.getTask('task-3')?.status).toBe('Canceled')
  })

  it('rejects if any taskId does not exist — before modifying any tasks', async () => {
    const api = makeApi()
    const originalStatus = api.getTask('task-1')?.status

    await expect(
      run(api.updateTasksBatch(['task-1', 'nonexistent'], {status: 'Completed'}))
    ).rejects.toBeInstanceOf(ValidationError)

    expect(api.getTask('task-1')?.status).toBe(originalStatus)
  })

  it('rejects with ValidationError when title is empty', async () => {
    const api = makeApi()

    await expect(
      run(api.updateTasksBatch(['task-1'], {title: ''}))
    ).rejects.toMatchObject({messages: ['Title cannot be empty']})
  })

  it('returns an empty array when given an empty taskIds list', async () => {
    const api = makeApi()
    const results = await run(api.updateTasksBatch([], {status: 'Completed'}))

    expect(results).toHaveLength(0)
  })

  it('rejects with a network error on simulated failure', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const api = makeApi()

    await expect(
      run(api.updateTasksBatch(['task-1'], {status: 'Completed'}))
    ).rejects.toMatchObject({messages: ['Network error: Unable to save changes']})
  })

  it('does not mutate any task when a network error occurs', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const api = makeApi()
    const originalStatuses = MOCK_TASKS.map(t => ({id: t.id, status: t.status}))

    await run(api.updateTasksBatch(['task-1', 'task-2'], {status: 'Canceled'})).catch(() => {})

    originalStatuses.forEach(({id, status}) => {
      expect(api.getTask(id)?.status).toBe(status)
    })
  })

  it('sets updatedAt on each updated task', async () => {
    const api = makeApi()
    const before = Date.now()
    const results = await run(api.updateTasksBatch(['task-1', 'task-2'], {status: 'InReview'}))

    results.forEach(t => {
      expect(t.updatedAt).toBeGreaterThanOrEqual(before)
    })
  })
})
