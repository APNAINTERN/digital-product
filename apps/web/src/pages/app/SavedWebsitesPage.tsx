import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Globe2, Pencil, Play, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { formatDate, normalizeUrlInput } from '../../lib/utils'
import { Button, Card, EmptyState, Input, Modal, Spinner } from '../../components/ui'
import type { SavedWebsite } from '../../types'

export default function SavedWebsitesPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [editing, setEditing] = useState<SavedWebsite | null>(null)

  const websitesQuery = useQuery({
    queryKey: ['websites', search],
    queryFn: async () => {
      const { data } = await api.get<{ websites: SavedWebsite[] }>('/websites', { params: { search: search || undefined } })
      return data.websites
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { url: normalizeUrlInput(editing?.url ?? url), label: editing?.label ?? label }
      if (editing) return api.patch(`/websites/${editing.id}`, payload)
      return api.post('/websites', payload)
    },
    onSuccess: () => {
      toast.success(editing ? 'Website updated' : 'Website saved')
      setUrl('')
      setLabel('')
      setEditing(null)
      queryClient.invalidateQueries({ queryKey: ['websites'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/websites/${id}`),
    onSuccess: () => {
      toast.success('Website removed')
      queryClient.invalidateQueries({ queryKey: ['websites'] })
    },
  })

  const analyze = async (websiteUrl: string) => {
    const { data } = await api.post<{ reportId: string }>('/analyze', { url: websiteUrl })
    navigate(`/app/analyze?id=${data.reportId}`)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    saveMutation.mutate()
  }

  return (
    <div className="page-shell">
      <div className="page-title"><h1>Saved websites</h1><p>Create reusable audit targets and launch analyses quickly.</p></div>
      <div className="two-column">
        <Card>
          <h2>Add website</h2>
          <form className="stack-form" onSubmit={submit}>
            <Input onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" required value={url} />
            <Input onChange={(event) => setLabel(event.target.value)} placeholder="Client or site label" value={label} />
            <Button disabled={saveMutation.isPending} type="submit">Save website</Button>
          </form>
        </Card>
        <Card>
          <h2>Search</h2>
          <Input onChange={(event) => setSearch(event.target.value)} placeholder="Search domain or label" value={search} />
        </Card>
      </div>
      <Card>
        {websitesQuery.isLoading ? <Spinner /> : websitesQuery.data?.length ? (
          <div className="card-grid">
            {websitesQuery.data.map((website) => (
              <Card className="nested-card" key={website.id}>
                <Globe2 size={22} />
                <h3>{website.label ?? website.domain}</h3>
                <p>{website.url}</p>
                <small>Saved {formatDate(website.createdAt)}</small>
                <div className="row-actions">
                  <Button onClick={() => analyze(website.url)} size="sm"><Play size={15} /> Analyze</Button>
                  <Button onClick={() => setEditing(website)} size="sm" variant="secondary"><Pencil size={15} /> Edit</Button>
                  <Button onClick={() => window.confirm('Delete saved website?') && deleteMutation.mutate(website.id)} size="sm" variant="danger"><Trash2 size={15} /></Button>
                </div>
              </Card>
            ))}
          </div>
        ) : <EmptyState title="No saved websites" />}
      </Card>
      <Modal onClose={() => setEditing(null)} open={Boolean(editing)} title="Edit website">
        <form className="stack-form" onSubmit={submit}>
          <Input onChange={(event) => setEditing((current) => current ? { ...current, url: event.target.value } : current)} value={editing?.url ?? ''} />
          <Input onChange={(event) => setEditing((current) => current ? { ...current, label: event.target.value } : current)} value={editing?.label ?? ''} />
          <Button disabled={saveMutation.isPending} type="submit">Update website</Button>
        </form>
      </Modal>
    </div>
  )
}
