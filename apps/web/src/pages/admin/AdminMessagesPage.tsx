import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { formatDate } from '../../lib/utils'
import { Badge, Button, Card, Input, Spinner } from '../../components/ui'
import type { ContactMessage, Pagination } from '../../types'

export default function AdminMessagesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const messagesQuery = useQuery({
    queryKey: ['admin-messages', search, status, page],
    queryFn: async () => {
      const { data } = await api.get<{ messages: ContactMessage[]; pagination: Pagination }>('/admin/messages', { params: { search: search || undefined, status: status || undefined, page, limit: 20 } })
      return data
    },
  })

  const patchMutation = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: string }) => api.patch(`/admin/messages/${id}`, { status: nextStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-messages'] }),
  })

  return (
    <div className="page-shell">
      <div className="page-title"><h1>Admin messages</h1><p>Review contact messages and update workflow status.</p></div>
      <Card className="toolbar">
        <Input onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search messages" value={search} />
        <Input onChange={(event) => { setStatus(event.target.value); setPage(1) }} placeholder="Filter status" value={status} />
      </Card>
      <Card>
        {messagesQuery.isLoading ? <Spinner /> : (
          <div className="message-list">
            {(messagesQuery.data?.messages ?? []).map((message) => (
              <Card className="nested-card" key={message.id}>
                <div className="section-heading">
                  <div><h3>{message.subject}</h3><p>{message.name} · <a href={`mailto:${message.email}`}>{message.email}</a></p></div>
                  <Badge tone={message.status === 'open' ? 'warning' : 'good'}>{message.status}</Badge>
                </div>
                <p>{message.message}</p>
                <small>{formatDate(message.createdAt)}</small>
                <div className="row-actions">
                  {['open', 'in_progress', 'closed'].map((nextStatus) => (
                    <Button disabled={message.status === nextStatus} key={nextStatus} onClick={() => patchMutation.mutate({ id: message.id, nextStatus })} size="sm" variant="secondary">{nextStatus}</Button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
      <div className="pagination"><Button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} variant="secondary">Previous</Button><span>Page {messagesQuery.data?.pagination.page ?? page} of {messagesQuery.data?.pagination.pages ?? 1}</span><Button disabled={page >= (messagesQuery.data?.pagination.pages ?? 1)} onClick={() => setPage((value) => value + 1)} variant="secondary">Next</Button></div>
    </div>
  )
}
