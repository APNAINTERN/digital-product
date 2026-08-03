import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { formatDate, formatNumber } from '../../lib/utils'
import { Badge, Button, Card, Input, Spinner } from '../../components/ui'
import type { Pagination, PlanCode, User, UserRole } from '../../types'

export default function AdminUsersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const usersQuery = useQuery({
    queryKey: ['admin-users', search, page],
    queryFn: async () => {
      const { data } = await api.get<{ users: User[]; pagination: Pagination }>('/admin/users', { params: { search: search || undefined, page, limit: 20 } })
      return data
    },
  })

  const patchMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Pick<User, 'role' | 'plan' | 'emailVerified' | 'apiCallsLimit'>> }) => api.patch(`/admin/users/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      toast.success('User deleted')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  return (
    <div className="page-shell">
      <div className="page-title"><h1>Admin users</h1><p>Manage roles, plans, verification, and account limits.</p></div>
      <Card className="toolbar"><Input onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search email or name" value={search} /></Card>
      <Card>
        {usersQuery.isLoading ? <Spinner /> : (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>User</th><th>Role</th><th>Plan</th><th>Usage</th><th>Verified</th><th>Created</th><th>Actions</th></tr></thead><tbody>
            {(usersQuery.data?.users ?? []).map((user) => (
              <tr key={user.id}>
                <td><strong>{user.name ?? 'Unnamed'}</strong><br /><small>{user.email}</small></td>
                <td><select className="sv-input slim" onChange={(event) => patchMutation.mutate({ id: user.id, payload: { role: event.target.value as UserRole } })} value={user.role}><option value="USER">USER</option><option value="ADMIN">ADMIN</option></select></td>
                <td><select className="sv-input slim" onChange={(event) => patchMutation.mutate({ id: user.id, payload: { plan: event.target.value as PlanCode } })} value={user.plan}><option value="FREE">FREE</option><option value="STARTER">STARTER</option><option value="PRO">PRO</option><option value="ENTERPRISE">ENTERPRISE</option></select></td>
                <td>{formatNumber(user.apiCallsUsed)} / {formatNumber(user.apiCallsLimit)}</td>
                <td><Badge tone={user.emailVerified ? 'good' : 'warning'}>{user.emailVerified ? 'Verified' : 'Pending'}</Badge></td>
                <td>{formatDate(user.createdAt)}</td>
                <td><Button onClick={() => window.confirm('Delete user?') && deleteMutation.mutate(user.id)} size="sm" variant="danger">Delete</Button></td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </Card>
      <div className="pagination"><Button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} variant="secondary">Previous</Button><span>Page {usersQuery.data?.pagination.page ?? page} of {usersQuery.data?.pagination.pages ?? 1}</span><Button disabled={page >= (usersQuery.data?.pagination.pages ?? 1)} onClick={() => setPage((value) => value + 1)} variant="secondary">Next</Button></div>
    </div>
  )
}
