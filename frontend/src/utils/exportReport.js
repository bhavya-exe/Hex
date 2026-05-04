import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── CSV Export ────────────────────────────────────────────────────────────────

export function exportCSV(result) {
  const { summary, results = [], filename } = result

  const rows = [
    ['HEX Security Scan Report'],
    ['File', filename],
    ['Security Score', summary.security_score ?? 'N/A'],
    ['Grade', summary.security_grade ?? 'N/A'],
    ['Verdict', summary.verdict ?? 'N/A'],
    ['Total Issues', summary.total_issues],
    ['Critical', summary.critical],
    ['High', summary.high],
    ['Medium', summary.medium],
    ['Low', summary.low],
    [],
    ['FINDINGS'],
    ['ID', 'Severity', 'Type', 'Title', 'Description', 'File Path', 'Remediation', 'CWE']
  ]

  results.forEach(r => {
    rows.push([
      r.id,
      r.severity,
      r.type,
      r.title,
      r.description,
      r.file_path || '',
      r.remediation || '',
      (r.cwe || []).join(', ')
    ])
  })

  const csv = rows.map(row =>
    row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n')

  download(`hex-report-${filename}.csv`, 'text/csv', csv)
}


// ── PDF Export ────────────────────────────────────────────────────────────────

export function exportPDF(result) {
  const { summary, results = [], filename } = result
  const doc = new jsPDF()

  const RED = [229, 62, 62]
  const DARK = [26, 29, 46]
  const GRAY = [113, 128, 150]

  // Header
  doc.setFillColor(...RED)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('HEX Security Report', 14, 18)

  // Meta
  doc.setTextColor(...GRAY)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36)
  doc.text(`File: ${filename}`, 14, 42)

  // Score cards
  const cards = [
    { label: 'Score', value: String(summary.security_score ?? 'N/A') },
    { label: 'Grade', value: summary.security_grade ?? 'N/A' },
    { label: 'Total Issues', value: String(summary.total_issues) },
    { label: 'Critical', value: String(summary.critical) },
    { label: 'High', value: String(summary.high) },
  ]

  let x = 14
  cards.forEach(card => {
    doc.setFillColor(...DARK)
    doc.roundedRect(x, 48, 36, 20, 2, 2, 'F')
    doc.setTextColor(...GRAY)
    doc.setFontSize(7)
    doc.text(card.label, x + 18, 54, { align: 'center' })
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(card.value, x + 18, 63, { align: 'center' })
    x += 40
  })

  // Verdict
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...GRAY)
  doc.text(`Verdict: ${summary.verdict ?? 'N/A'}`, 14, 78)

  // Findings table
  doc.setFontSize(12)
  doc.setTextColor(226, 232, 240)
  doc.setFont('helvetica', 'bold')
  doc.text('Findings', 14, 88)

  const severityColor = (s) => {
    if (s === 'CRITICAL') return [252, 68, 68]
    if (s === 'HIGH') return [246, 173, 85]
    if (s === 'MEDIUM') return [246, 224, 94]
    if (s === 'LOW') return [104, 211, 145]
    return [160, 174, 192]
  }

  autoTable(doc, {
    startY: 92,
    head: [['Severity', 'Type', 'Title', 'Description', 'Remediation']],
    body: results.map(r => [r.severity, r.type, r.title, r.description, r.remediation || '—']),
    styles: { fontSize: 8, cellPadding: 3, textColor: [226, 232, 240], fillColor: [26, 29, 46] },
    headStyles: { fillColor: [45, 55, 72], textColor: [160, 174, 192], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [15, 17, 23] },
    columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 22 }, 2: { cellWidth: 40 }, 3: { cellWidth: 60 }, 4: { cellWidth: 45 } },
    didParseCell: (data) => {
      if (data.column.index === 0 && data.section === 'body') {
        data.cell.styles.textColor = severityColor(data.cell.raw)
        data.cell.styles.fontStyle = 'bold'
      }
    }
  })

  doc.save(`hex-report-${filename}.pdf`)
}


// ── Helper ────────────────────────────────────────────────────────────────────

function download(filename, mime, content) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
