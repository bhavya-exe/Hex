import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ResultsTable from './ResultsTable'

const mockResults = [
  {
    id: 'HEX-001',
    severity: 'CRITICAL',
    type: 'VULNERABILITY',
    title: 'Arbitrary code execution',
    description: 'Unsafe pickle deserialization',
    remediation: 'Avoid pickle files'
  },
  {
    id: 'HEX-002',
    severity: 'HIGH',
    type: 'COMPLIANCE',
    title: 'No license file',
    description: 'Missing LICENSE',
    remediation: 'Add a LICENSE file'
  }
]

describe('ResultsTable', () => {
  it('renders findings count', () => {
    render(<ResultsTable results={mockResults} />)
    expect(screen.getByText('Findings (2)')).toBeDefined()
  })

  it('renders all severity badges', () => {
    render(<ResultsTable results={mockResults} />)
    expect(screen.getByText('CRITICAL')).toBeDefined()
    expect(screen.getByText('HIGH')).toBeDefined()
  })

  it('renders finding titles', () => {
    render(<ResultsTable results={mockResults} />)
    expect(screen.getByText('Arbitrary code execution')).toBeDefined()
    expect(screen.getByText('No license file')).toBeDefined()
  })

  it('renders remediation text', () => {
    render(<ResultsTable results={mockResults} />)
    expect(screen.getByText('Avoid pickle files')).toBeDefined()
  })

  it('shows empty state when no results', () => {
    render(<ResultsTable results={[]} />)
    expect(screen.getByText('No findings detected')).toBeDefined()
    expect(screen.getByText('Findings (0)')).toBeDefined()
  })
})
