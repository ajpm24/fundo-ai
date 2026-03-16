import React from 'react'

const STATUS = {
  rascunho:  { label: 'Rascunho',   cls: 'badge-gray' },
  em_curso:  { label: 'Em Curso',   cls: 'badge-blue' },
  submetida: { label: 'Submetida',  cls: 'badge-cyan' },
  aprovada:  { label: 'Aprovada',   cls: 'badge-green' },
  rejeitada: { label: 'Rejeitada',  cls: 'badge-red' },
}

export default function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, cls: 'badge-gray' }
  return <span className={`badge ${s.cls}`}>{s.label}</span>
}
