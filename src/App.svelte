<script lang="ts">
  import {onMount} from 'svelte'
  import type {ListableTask, TaskStatus, TaskTableColumnConfig} from './types'
  import {MOCK_TASKS} from './mockData'
  import {initializeMockAPI, getMockAPI} from './mockApi'
  import TaskTableRow from './components/TaskTableRow.svelte'

  let tasks: ListableTask[] = []
  let selectedTaskIds = new Set<string>()
  let lastSelectedIndex: number | null = null

  let batchStatus: TaskStatus | '' = ''
  let isBatchUpdating = false
  let batchError: string | null = null

  const columnConfig: TaskTableColumnConfig = {
    showCheckbox: true,
    showStatus: true,
    showNumber: true,
    showTitle: true,
    showProjectName: true,
    showDueDate: true,
    showCoordinator: true,
    showAssignedTo: true,
    showUpdates: true,
    showTags: true,
    showWorkOrder: true,
    showArea: true,
  }

  onMount(() => {
    initializeMockAPI(MOCK_TASKS)
    const api = getMockAPI()
    tasks = api.getAllTasks()
  })

  function handleTaskSelected(event: CustomEvent<ListableTask>): void {
    console.log('Task selected:', event.detail)
    alert(`Opened task: ${event.detail.title}`)
  }

  function handleTaskUpdated(event: CustomEvent<ListableTask>): void {
    const updatedTask = event.detail
    tasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
  }

  function handleCheckboxChange(event: CustomEvent<{
    taskId: string
    selected: boolean
    shiftKey: boolean
    rowIndex?: number
  }>): void {
    const {taskId, selected, shiftKey, rowIndex} = event.detail

    if (shiftKey && lastSelectedIndex !== null && rowIndex !== undefined) {
      const start = Math.min(lastSelectedIndex, rowIndex)
      const end = Math.max(lastSelectedIndex, rowIndex)
      tasks.slice(start, end + 1).forEach(t => {
        if (selected) {
          selectedTaskIds.add(t.id)
        } else {
          selectedTaskIds.delete(t.id)
        }
      })
    } else {
      if (selected) {
        selectedTaskIds.add(taskId)
      } else {
        selectedTaskIds.delete(taskId)
      }
      lastSelectedIndex = rowIndex ?? null
    }

    selectedTaskIds = selectedTaskIds
  }

  function selectAll(): void {
    selectedTaskIds = new Set(tasks.map(t => t.id))
  }

  function clearSelection(): void {
    selectedTaskIds = new Set()
    lastSelectedIndex = null
    batchStatus = ''
    batchError = null
  }

  async function handleBatchStatusChange(): Promise<void> {
    if (!batchStatus || isBatchUpdating) return
    isBatchUpdating = true
    batchError = null
    try {
      const api = getMockAPI()
      const updatedTasks = await api.updateTasksBatch(
        Array.from(selectedTaskIds),
        {status: batchStatus as TaskStatus}
      )
      const updatedMap = new Map(updatedTasks.map(t => [t.id, t]))
      tasks = tasks.map(t => updatedMap.get(t.id) ?? t)
      clearSelection()
    } catch (err: any) {
      batchError = err.messages?.[0] ?? 'Batch update failed. Please try again.'
    } finally {
      isBatchUpdating = false
    }
  }

  $: isSelectColumnVisible = selectedTaskIds.size > 0 || true
</script>

<div class="p-4">
  <div class="flex items-center justify-between gap-4" style="margin-bottom: 1rem;">
    <h1 style="font-size: 1.5rem; font-weight: 600; margin: 0;">
      Task Management Table
    </h1>
    <div class="flex gap-2">
      <button on:click={selectAll}>Select All</button>
      <button on:click={clearSelection}>Clear Selection</button>
    </div>
  </div>

  {#if selectedTaskIds.size > 0}
    <div
      class="flex items-center gap-2 p-4 bg-white border rounded-lg"
      style="margin-bottom: 1rem; flex-wrap: wrap;"
    >
      <span style="font-weight: 600; white-space: nowrap;">
        ✓ {selectedTaskIds.size} task{selectedTaskIds.size === 1 ? '' : 's'} selected
      </span>

      <select
        bind:value={batchStatus}
        disabled={isBatchUpdating}
        style="padding: 0.375rem 0.625rem; border: 1px solid #e4e4e7; border-radius: 0.375rem; font-size: 0.875rem; background: white; cursor: pointer;"
      >
        <option value="">Change Status…</option>
        <option value="Open">Open</option>
        <option value="InProgress">In Progress</option>
        <option value="InReview">In Review</option>
        <option value="Completed">Completed</option>
        <option value="Canceled">Canceled</option>
      </select>

      <button
        on:click={handleBatchStatusChange}
        disabled={!batchStatus || isBatchUpdating}
        style="background: #18181b; color: white; border-color: #18181b;"
      >
        {isBatchUpdating ? 'Updating…' : 'Apply'}
      </button>

      <button on:click={clearSelection} disabled={isBatchUpdating}>
        Cancel
      </button>

      {#if batchError}
        <span style="font-size: 0.875rem; color: #dc2626; white-space: nowrap;">
          ⚠ {batchError}
        </span>
      {/if}
    </div>
  {/if}

  <div class="rounded-lg shadow" style="overflow-x: auto;">
    <table>
      <thead>
        <tr>
          {#if columnConfig.showCheckbox}
            <th style="width: 50px; text-align: center;">
              <input
                type="checkbox"
                checked={selectedTaskIds.size === tasks.length && tasks.length > 0}
                indeterminate={selectedTaskIds.size > 0 && selectedTaskIds.size < tasks.length}
                on:change={(e) => {
                  if (e.currentTarget.checked) {
                    selectAll()
                  } else {
                    clearSelection()
                  }
                }}
              />
            </th>
          {/if}
          {#if columnConfig.showStatus}<th style="width: 80px;">Status</th>{/if}
          {#if columnConfig.showNumber}<th style="width: 100px;">Number</th>{/if}
          {#if columnConfig.showTitle}<th>Title</th>{/if}
          {#if columnConfig.showProjectName}<th style="width: 180px;">Project</th>{/if}
          {#if columnConfig.showDueDate}<th style="width: 120px;">Due Date</th>{/if}
          {#if columnConfig.showCoordinator}<th style="width: 80px;">Coordinator</th>{/if}
          {#if columnConfig.showAssignedTo}<th style="width: 120px;">Assigned To</th>{/if}
          {#if columnConfig.showUpdates}<th style="width: 120px;">Updates</th>{/if}
          {#if columnConfig.showTags}<th style="width: 150px;">Tags</th>{/if}
          {#if columnConfig.showWorkOrder}<th style="width: 120px;">Work Order</th>{/if}
          {#if columnConfig.showArea}<th style="width: 120px;">Area</th>{/if}
        </tr>
      </thead>
      <tbody class:loading={isBatchUpdating}>
        {#each tasks as task, index (task.id)}
          <TaskTableRow
            {task}
            {columnConfig}
            isSelected={selectedTaskIds.has(task.id)}
            {isSelectColumnVisible}
            rowIndex={index}
            on:selected={handleTaskSelected}
            on:updated={handleTaskUpdated}
            on:checkboxSelectionChange={handleCheckboxChange}
          />
        {/each}
      </tbody>
    </table>
  </div>
</div>
