export function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface Section {
  title: string
  headers: string[]
  rows: (string | number)[][]
}

export function buildCSV(sections: Section[]): string {
  const escape = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines: string[] = []
  for (const sec of sections) {
    lines.push(escape(sec.title))
    lines.push(sec.headers.map(escape).join(','))
    for (const row of sec.rows) {
      lines.push(row.map(escape).join(','))
    }
    lines.push('')
  }
  return lines.join('\r\n')
}
