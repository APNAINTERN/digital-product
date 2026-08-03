import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { formatDate } from '../../lib/utils'
import { Badge, Button, Card, Input, Spinner } from '../../components/ui'
import type { FeatureFlag, SystemSetting } from '../../types'

export default function AdminSettingsPage() {
  const queryClient = useQueryClient()
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const featuresQuery = useQuery({
    queryKey: ['admin-features'],
    queryFn: async () => {
      const { data } = await api.get<{ features: FeatureFlag[] }>('/admin/features')
      return data.features
    },
  })
  const settingsQuery = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data } = await api.get<{ settings: SystemSetting[] }>('/admin/settings')
      return data.settings
    },
  })

  const featureMutation = useMutation({
    mutationFn: async (feature: FeatureFlag) => api.patch(`/admin/features/${feature.key}`, { enabled: !feature.enabled, name: feature.name, description: feature.description }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-features'] }),
  })
  const settingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => api.patch(`/admin/settings/${key}`, { value }),
    onSuccess: () => {
      toast.success('Setting saved')
      setNewKey('')
      setNewValue('')
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
    },
  })

  return (
    <div className="page-shell">
      <div className="page-title"><h1>Admin settings</h1><p>Manage feature flags and system configuration keys.</p></div>
      <div className="two-column">
        <Card>
          <h2>Feature flags</h2>
          {featuresQuery.isLoading ? <Spinner /> : (
            <div className="compact-list">
              {(featuresQuery.data ?? []).map((feature) => (
                <div className="compact-row" key={feature.key}>
                  <span><strong>{feature.name}</strong><small>{feature.key} · {feature.description}</small></span>
                  <Badge tone={feature.enabled ? 'good' : 'danger'}>{feature.enabled ? 'Enabled' : 'Disabled'}</Badge>
                  <Button onClick={() => featureMutation.mutate(feature)} size="sm" variant="secondary">Toggle</Button>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h2>Add or update setting</h2>
          <form className="stack-form" onSubmit={(event) => { event.preventDefault(); settingMutation.mutate({ key: newKey, value: newValue }) }}>
            <Input onChange={(event) => setNewKey(event.target.value)} placeholder="setting.key" required value={newKey} />
            <Input onChange={(event) => setNewValue(event.target.value)} placeholder="value" required value={newValue} />
            <Button disabled={settingMutation.isPending} type="submit">Save setting</Button>
          </form>
        </Card>
      </div>
      <Card>
        <h2>System settings</h2>
        {settingsQuery.isLoading ? <Spinner /> : (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Key</th><th>Value</th><th>Updated</th><th>Action</th></tr></thead><tbody>
            {(settingsQuery.data ?? []).map((setting) => (
              <tr key={setting.key}>
                <td>{setting.key}</td>
                <td><code>{setting.value}</code></td>
                <td>{formatDate(setting.updatedAt)}</td>
                <td><Button onClick={() => { setNewKey(setting.key); setNewValue(setting.value) }} size="sm" variant="secondary">Edit</Button></td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </Card>
    </div>
  )
}
