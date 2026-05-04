import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Dashboard from './Dashboard'

const mockResult = {
  filename: 'model.safetensors',
  summary: {
    total_issues: 3,
    critical: 1,
    high: 1,
    medium: 1,
    low: 0,
    security_score: 72,
    security_grade: 'B',
    verdict: 'SAFE - Good security posture'
  },
  results: [
    {
      id: 'HEX-001',
      severity: 'CRITICAL',
      type: 'VULNERABILITY',
      title: 'Code execution risk',
      description: 'Unsafe deserialization',
      remediation: 'Use safetensors format'
    }
  ]
}

describe('Dashboard', () => {
  it('renders filename', () => {
    render(<Dashboard result={mockResult} onReset={() => {}} />)
    expect(screen.getByText(/model\.safetensors/)).toBeDefined()
  })

  it('renders security score', () => {
    render(<Dashboard result={mockResult} onReset={() => {}} />)
    expect(screen.getByText('72')).toBeDefined()
  })

  it('renders security grade', () => {
    render(<Dashboard result={mockResult} onReset={() => {}} />)
    expect(screen.getByText('B')).toBeDefined()
  })

  it('renders total issues', () => {
    render(<Dashboard result={mockResult} onReset={() => {}} />)
    expect(screen.getByText('3')).toBeDefined()
  })

  it('renders verdict', () => {
    render(<Dashboard result={mockResult} onReset={() => {}} />)
    expect(screen.getByText('SAFE - Good security posture')).toBeDefined()
  })

  it('calls onReset when New Scan is clicked', () => {
    const onReset = vi.fn()
    render(<Dashboard result={mockResult} onReset={onReset} />)
    fireEvent.click(screen.getByText('← New Scan'))
    expect(onReset).toHaveBeenCalledOnce()
  })
})
