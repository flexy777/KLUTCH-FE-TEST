import {describe, it, expect} from 'vitest'
import {formatDisplayDate, formatDate, formatDateTime, relativeTime} from './utils'

describe('formatDisplayDate', () => {
  it('formats a valid ISO date string as MM/DD/YYYY', () => {
    expect(formatDisplayDate('2024-01-15')).toBe('01/15/2024')
    expect(formatDisplayDate('2024-12-31')).toBe('12/31/2024')
  })

  it('returns — for null', () => {
    expect(formatDisplayDate(null)).toBe('—')
  })

  it('returns — for an invalid date string', () => {
    expect(formatDisplayDate('not-a-date')).toBe('—')
    expect(formatDisplayDate('2024-99-99')).toBe('—')
  })
})

describe('formatDate', () => {
  it('formats a unix timestamp as MM/DD/YYYY', () => {
    // Jan 15 2024 UTC
    const ts = new Date('2024-01-15T00:00:00').getTime()
    expect(formatDate(ts)).toMatch(/01\/15\/2024/)
  })
})

describe('formatDateTime', () => {
  it('includes the date and a time component', () => {
    const ts = new Date('2024-06-01T14:30:00').getTime()
    const result = formatDateTime(ts)
    expect(result).toMatch(/06\/01\/2024/)
    expect(result).toMatch(/2:30/)
  })
})

describe('relativeTime', () => {
  it('returns "Just now" for a timestamp within the last minute', () => {
    expect(relativeTime(Date.now())).toBe('Just now')
    expect(relativeTime(Date.now() - 30_000)).toBe('Just now')
  })

  it('returns minutes ago for timestamps a few minutes back', () => {
    expect(relativeTime(Date.now() - 5 * 60_000)).toBe('5 minutes ago')
    expect(relativeTime(Date.now() - 30 * 60_000)).toBe('30 minutes ago')
  })

  it('returns hours ago for timestamps several hours back', () => {
    expect(relativeTime(Date.now() - 3 * 3_600_000)).toBe('3 hours ago')
  })

  it('returns days ago for timestamps more than a day back', () => {
    expect(relativeTime(Date.now() - 2 * 86_400_000)).toBe('2 days ago')
    expect(relativeTime(Date.now() - 7 * 86_400_000)).toBe('7 days ago')
  })
})
