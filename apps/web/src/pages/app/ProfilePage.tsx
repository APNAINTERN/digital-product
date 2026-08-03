import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import { Button, Card, Input } from '../../components/ui'
import type { User } from '../../types'

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const [name, setName] = useState(user?.name ?? '')
  const [theme, setTheme] = useState(user?.theme ?? 'system')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const profileMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch<{ user: User }>('/auth/me', { name, theme })
      return data.user
    },
    onSuccess: (updated) => {
      setUser(updated)
      toast.success('Profile updated')
    },
  })

  const passwordMutation = useMutation({
    mutationFn: async () => api.post('/auth/change-password', { currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      toast.success('Password updated')
    },
  })

  const saveProfile = (event: FormEvent) => {
    event.preventDefault()
    profileMutation.mutate()
  }

  const changePassword = (event: FormEvent) => {
    event.preventDefault()
    passwordMutation.mutate()
  }

  return (
    <div className="page-shell narrow">
      <div className="page-title"><h1>Profile</h1><p>Manage your workspace identity, theme preference, and password.</p></div>
      <Card>
        <h2>Account</h2>
        <dl className="definition-list">
          <div><dt>Email</dt><dd>{user?.email}</dd></div>
          <div><dt>Plan</dt><dd>{user?.plan}</dd></div>
          <div><dt>Email verified</dt><dd>{user?.emailVerified ? 'Yes' : 'No'}</dd></div>
        </dl>
      </Card>
      <Card>
        <h2>Edit profile</h2>
        <form className="stack-form" onSubmit={saveProfile}>
          <label>Name<Input onChange={(event) => setName(event.target.value)} value={name} /></label>
          <label>Theme
            <select className="sv-input" onChange={(event) => setTheme(event.target.value)} value={theme}>
              <option value="system">System</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>
          <Button disabled={profileMutation.isPending} type="submit">Save changes</Button>
        </form>
      </Card>
      <Card>
        <h2>Change password</h2>
        <form className="stack-form" onSubmit={changePassword}>
          <Input onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Current password" type="password" value={currentPassword} />
          <Input minLength={8} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" type="password" value={newPassword} />
          <Button disabled={passwordMutation.isPending} type="submit" variant="secondary">Update password</Button>
        </form>
      </Card>
    </div>
  )
}
