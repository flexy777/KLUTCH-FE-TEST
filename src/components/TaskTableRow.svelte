<script lang="ts">
  import {createEventDispatcher} from 'svelte'
  import type {ListableTask, TaskStatus, TaskTableColumnConfig} from '../types'
  import Tr from './stubs/Tr.svelte'
  import Td from './stubs/Td.svelte'
  import StatusBadge from './stubs/StatusBadge.svelte'
  import UserAvatar from './stubs/UserAvatar.svelte'
  import Pill from './stubs/Pill.svelte'
  import MediaThumbnail from './stubs/MediaThumbnail.svelte'
  import {formatDisplayDate} from '../utils'
  import {getMockAPI} from '../mockApi'

  export let task: ListableTask
  export let columnConfig: TaskTableColumnConfig
  export let isSelected: boolean = false
  export let isSelectColumnVisible: boolean = true
  export let rowIndex: number = 0

  const dispatch = createEventDispatcher<{
    selected: ListableTask
    updated: ListableTask
    checkboxSelectionChange: {
      taskId: string
      selected: boolean
      shiftKey: boolean
      rowIndex: number
    }
  }>()

  let pendingShiftKey = false

  function handleClick(): void {
    if (!isEditing) dispatch('selected', task)
  }

  function handleCheckboxClick(e: MouseEvent): void {
    e.stopPropagation()
    pendingShiftKey = e.shiftKey
  }

  function handleCheckboxChange(event: Event): void {
    const target = event.target as HTMLInputElement
    dispatch('checkboxSelectionChange', {
      taskId: task.id,
      selected: target.checked,
      shiftKey: pendingShiftKey,
      rowIndex,
    })
    pendingShiftKey = false
  }

  let isEditing = false
  let editValue = ''
  let isSaving = false
  let editError: string | null = null
  let inputEl: HTMLInputElement

  function startEdit(e: MouseEvent): void {
    e.stopPropagation()
    isEditing = true
    editValue = task.title
    editError = null
    setTimeout(() => inputEl?.focus(), 0)
  }

  async function saveEdit(): Promise<void> {
    if (!isEditing || isSaving) return
    const trimmed = editValue.trim()
    if (trimmed === task.title) { cancelEdit(); return }

    isSaving = true
    editError = null
    const originalTask = {...task}

    dispatch('updated', {...task, title: trimmed, updatedAt: Date.now()})
    isEditing = false

    try {
      const confirmed = await getMockAPI().updateTask(task.id, {title: trimmed})
      dispatch('updated', confirmed)
    } catch (err: any) {
      dispatch('updated', originalTask)
      isEditing = true
      editValue = trimmed
      editError = err.messages?.[0] ?? 'Failed to save. Please try again.'
      setTimeout(() => inputEl?.focus(), 0)
    } finally {
      isSaving = false
    }
  }

  function cancelEdit(): void {
    isEditing = false
    editValue = ''
    editError = null
  }

  function handleTitleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter') { e.preventDefault(); saveEdit() }
    else if (e.key === 'Escape') { cancelEdit() }
  }

  async function handleTitleBlur(): Promise<void> {
    if (!isEditing || isSaving) return
    await saveEdit()
  }

  const STATUS_OPTIONS: {value: TaskStatus; label: string}[] = [
    {value: 'Open',       label: 'Open'},
    {value: 'InProgress', label: 'In Progress'},
    {value: 'InReview',   label: 'In Review'},
    {value: 'Completed',  label: 'Completed'},
    {value: 'Canceled',   label: 'Canceled'},
  ]

  let isEditingStatus = false
  let statusSaving = false
  let statusError: string | null = null
  let statusErrorTimer: ReturnType<typeof setTimeout>

  function startStatusEdit(e: MouseEvent): void {
    e.stopPropagation()
    isEditingStatus = true
    statusError = null
  }

  async function handleStatusChange(e: Event): Promise<void> {
    const newStatus = (e.target as HTMLSelectElement).value as TaskStatus
    isEditingStatus = false
    if (newStatus === task.status) return

    statusSaving = true
    const originalTask = {...task}
    dispatch('updated', {...task, status: newStatus, updatedAt: Date.now()})

    try {
      const confirmed = await getMockAPI().updateTask(task.id, {status: newStatus})
      dispatch('updated', confirmed)
    } catch (err: any) {
      dispatch('updated', originalTask)
      statusError = err.messages?.[0] ?? 'Failed to update status.'
      clearTimeout(statusErrorTimer)
      statusErrorTimer = setTimeout(() => { statusError = null }, 4000)
    } finally {
      statusSaving = false
    }
  }
  let isEditingDueDate = false
  let dueDateSaving = false
  let dueDateError: string | null = null
  let dueDateErrorTimer: ReturnType<typeof setTimeout>
  let dateInputEl: HTMLInputElement

  function startDueDateEdit(e: MouseEvent): void {
    e.stopPropagation()
    isEditingDueDate = true
    dueDateError = null
    setTimeout(() => dateInputEl?.focus(), 0)
  }

  async function handleDueDateChange(e: Event): Promise<void> {
    const newDate = (e.target as HTMLInputElement).value || null
    isEditingDueDate = false
    if (newDate === task.dueDate) return

    dueDateSaving = true
    const originalTask = {...task}
    dispatch('updated', {...task, dueDate: newDate, updatedAt: Date.now()})

    try {
      const confirmed = await getMockAPI().updateTask(task.id, {dueDate: newDate})
      dispatch('updated', confirmed)
    } catch (err: any) {
      dispatch('updated', originalTask)
      dueDateError = err.messages?.[0] ?? 'Failed to update date.'
      clearTimeout(dueDateErrorTimer)
      dueDateErrorTimer = setTimeout(() => { dueDateError = null }, 4000)
    } finally {
      dueDateSaving = false
    }
  }

  function handleDueDateKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') { isEditingDueDate = false }
    else if (e.key === 'Enter') { dateInputEl?.blur() }
  }
</script>

<Tr on:click={handleClick}>
  {#if isSelectColumnVisible && columnConfig.showCheckbox}
    <Td
      style="text-align: center; padding: 0.5rem;"
      on:click={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={isSelected}
        on:click={handleCheckboxClick}
        on:change={handleCheckboxChange}
      />
    </Td>
  {/if}

  {#if columnConfig.showStatus}
    <Td style="padding: 0.5rem;" on:click={(e) => e.stopPropagation()}>
      {#if isEditingStatus}
        <select
          value={task.status}
          on:change={handleStatusChange}
          on:blur={() => { isEditingStatus = false }}
          on:keydown={(e) => { if (e.key === 'Escape') isEditingStatus = false }}
          style="width: 100%; font-size: 0.75rem; padding: 0.2rem; border: 1px solid #e4e4e7; border-radius: 0.25rem;"
        >
          {#each STATUS_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      {:else}
        <div
          on:click={startStatusEdit}
          title="Click to change status"
          style="cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem;"
        >
          <StatusBadge status={task.status} />
          {#if statusSaving}
            <span style="font-size: 0.625rem; color: #71717a;">…</span>
          {/if}
        </div>
        {#if statusError}
          <div style="font-size: 0.625rem; color: #dc2626; margin-top: 0.125rem; max-width: 80px; white-space: normal;">{statusError}</div>
        {/if}
      {/if}
    </Td>
  {/if}

  {#if columnConfig.showNumber}
    <Td style="padding: 0.5rem;">
      <span style="font-family: monospace; color: #71717a;">{task.number}</span>
    </Td>
  {/if}

  {#if columnConfig.showTitle}
    <Td style="padding: 0.5rem;" on:click={(e) => e.stopPropagation()}>
      <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
        {#if task.photoCount > 0}
          <MediaThumbnail
            src={task.featuredPhotoUrl}
            alt={task.title}
            photoCount={task.photoCount}
            on:click={(e) => {
              e.stopPropagation()
              alert(`View ${task.photoCount} photo${task.photoCount > 1 ? 's' : ''}`)
            }}
          />
        {/if}

        {#if isEditing}
          <div style="flex: 1; display: flex; flex-direction: column; gap: 0.25rem;">
            <div style="display: flex; align-items: center; gap: 0.25rem;">
              <input
                type="text"
                bind:this={inputEl}
                bind:value={editValue}
                on:keydown={handleTitleKeyDown}
                on:blur={handleTitleBlur}
                disabled={isSaving}
                style="flex: 1; min-width: 0;"
              />
              {#if isSaving}
                <span style="font-size: 0.75rem; color: #71717a; white-space: nowrap;">Saving…</span>
              {:else}
                <button
                  on:mousedown|preventDefault
                  on:click={saveEdit}
                  title="Save (Enter)"
                  style="padding: 0.2rem 0.5rem; font-size: 0.75rem; color: #16a34a; border-color: #16a34a;"
                >✓</button>
                <button
                  on:mousedown|preventDefault
                  on:click={cancelEdit}
                  title="Cancel (Esc)"
                  style="padding: 0.2rem 0.5rem; font-size: 0.75rem;"
                >✕</button>
              {/if}
            </div>
            {#if editError}
              <span style="font-size: 0.75rem; color: #dc2626;">{editError}</span>
            {/if}
          </div>
        {:else}
          <span
            on:click={startEdit}
            title="Click to edit title"
            style="cursor: text; flex: 1; min-width: 0;"
          >{task.title}</span>
        {/if}
      </div>
    </Td>
  {/if}

  {#if columnConfig.showProjectName}
    <Td style="padding: 0.5rem;">
      {task.projectName}
    </Td>
  {/if}

  {#if columnConfig.showDueDate}
    <Td style="padding: 0.5rem;" on:click={(e) => e.stopPropagation()}>
      {#if isEditingDueDate}
        <input
          type="date"
          bind:this={dateInputEl}
          value={task.dueDate ?? ''}
          on:change={handleDueDateChange}
          on:blur={() => { isEditingDueDate = false }}
          on:keydown={handleDueDateKeyDown}
          style="width: 100%; font-size: 0.75rem; padding: 0.2rem; border: 1px solid #e4e4e7; border-radius: 0.25rem;"
        />
      {:else}
        <div
          on:click={startDueDateEdit}
          title="Click to edit due date"
          style="cursor: pointer; display: flex; align-items: center; gap: 0.25rem;"
        >
          <span style={task.dueDate ? '' : 'color: #a1a1aa;'}>
            {task.dueDate ? formatDisplayDate(task.dueDate) : '—'}
          </span>
          {#if dueDateSaving}
            <span style="font-size: 0.625rem; color: #71717a;">…</span>
          {/if}
        </div>
        {#if dueDateError}
          <div style="font-size: 0.625rem; color: #dc2626; margin-top: 0.125rem;">{dueDateError}</div>
        {/if}
      {/if}
    </Td>
  {/if}

  {#if columnConfig.showCoordinator}
    <Td style="padding: 0.5rem;">
      {#if task.coordinatorInitials}
        <UserAvatar
          initials={task.coordinatorInitials}
          fullName={task.coordinatorName || undefined}
        />
      {:else}
        <span style="color: #a1a1aa;">—</span>
      {/if}
    </Td>
  {/if}

  {#if columnConfig.showAssignedTo}
    <Td style="padding: 0.5rem;">
      {#if task.assignedToInitials}
        <UserAvatar
          initials={task.assignedToInitials}
          fullName={task.assignedToName || undefined}
        />
      {:else}
        <span style="color: #a1a1aa;">—</span>
      {/if}
    </Td>
  {/if}

  {#if columnConfig.showUpdates}
    <Td style="padding: 0.5rem;">
      {#if task.updatesCount > 0}
        <span style="font-size: 0.875rem; color: #71717a;">
          {task.updatesCount} update{task.updatesCount > 1 ? 's' : ''}
        </span>
      {:else}
        <span style="color: #a1a1aa;">—</span>
      {/if}
    </Td>
  {/if}

  {#if columnConfig.showTags}
    <Td style="padding: 0.5rem;">
      {#if task.tags && task.tags.length > 0}
        <div style="display: flex; gap: 0.25rem; flex-wrap: wrap;">
          {#each task.tags.slice(0, 2) as tag}
            <Pill {tag} />
          {/each}
          {#if task.tags.length > 2}
            <Pill label={`+${task.tags.length - 2}`} variant="default" />
          {/if}
        </div>
      {:else}
        <span style="color: #a1a1aa;">—</span>
      {/if}
    </Td>
  {/if}

  {#if columnConfig.showWorkOrder}
    <Td style="padding: 0.5rem;">
      {#if task.workOrderId}
        <a
          href={`/work-orders/${task.workOrderId}`}
          style="color: #3b82f6; text-decoration: underline; cursor: pointer;"
          on:click={(e) => {
            e.stopPropagation()
            alert(`View work order: ${task.workOrderId}`)
          }}
        >
          #{task.workOrderNumber}
        </a>
      {:else}
        <span style="color: #a1a1aa;">—</span>
      {/if}
    </Td>
  {/if}

  {#if columnConfig.showArea}
    <Td style="padding: 0.5rem;">
      {task.areaName || '—'}
    </Td>
  {/if}
</Tr>
