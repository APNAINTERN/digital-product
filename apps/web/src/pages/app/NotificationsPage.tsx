import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { formatDate } from '../../lib/utils'
import { Badge, Button, Card, EmptyState, Spinner } from '../../components/ui'
import type { NotificationItem, Pagination } from '../../types'

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [page, setPage] = useState(1)
  const notificationsQuery = useQuery({
    queryKey: ['notifications', unreadOnly, page],
    queryFn: async () => {
      const { data } = await api.get<{ notifications: NotificationItem[]; unreadCount: number; pagination: Pagination }>('/notifications', {
        params: { unread: unreadOnly || undefined, page, limit: 20 },
      })
      return data
    },
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  const readMutation = useMutation({ mutationFn: async (id: string) => api.patch(`/notifications/${id}/read`), onSuccess: refresh })
  const readAllMutation = useMutation({ mutationFn: async () => api.post('/notifications/read-all'), onSuccess: refresh })
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      toast.success('Notification deleted')
      refresh()
    },
  })

  return (
    <div className="page-shell">
      <div className="section-heading page-title">
        <div><h1>Notifications</h1><p>{notificationsQuery.data?.unreadCount ?? 0} unread updates from SEO Vision AI.</p></div>
        <div className="row-actions">
          <Button onClick={() => setUnreadOnly((value) => !value)} variant={unreadOnly ? 'primary' : 'secondary'}><Bell size={16} /> Unread</Button>
          <Button onClick={() => readAllMutation.mutate()} variant="secondary"><CheckCheck size={16} /> Mark all read</Button>
        </div>
      </div>
      <Card>
        {notificationsQuery.isLoading ? <Spinner /> : notificationsQuery.data?.notifications.length ? (
          <div className="notification-list">
            {notificationsQuery.data.notifications.map((item) => (
              <div className={item.read ? 'notification-row' : 'notification-row is-unread'} key={item.id}>
                <Badge tone={item.type === 'error' ? 'danger' : item.type === 'success' ? 'good' : 'info'}>{item.type}</Badge>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.message}</p>
                  <small>{formatDate(item.createdAt)}</small>
                </div>
                <div className="row-actions">
                  {item.link ? <Link className="icon-link" to={item.link.startsWith('/app') ? item.link : `/app${item.link}`}>Open</Link> : null}
                  {!item.read ? <Button onClick={() => readMutation.mutate(item.id)} size="sm" variant="secondary">Read</Button> : null}
                  <Button onClick={() => deleteMutation.mutate(item.id)} size="sm" variant="danger"><Trash2 size={15} /></Button>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState title="No notifications" />}
      </Card>
      <div className="pagination">
        <Button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} variant="secondary">Previous</Button>
        <span>Page {notificationsQuery.data?.pagination.page ?? page} of {notificationsQuery.data?.pagination.pages ?? 1}</span>
        <Button disabled={page >= (notificationsQuery.data?.pagination.pages ?? 1)} onClick={() => setPage((value) => value + 1)} variant="secondary">Next</Button>
      </div>
    </div>
  )
}
