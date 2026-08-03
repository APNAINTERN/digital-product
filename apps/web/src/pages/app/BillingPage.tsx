import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, Crown } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { formatNumber } from '../../lib/utils'
import { useAuthStore } from '../../stores/authStore'
import { Badge, Button, Card, EmptyState, Progress, Spinner } from '../../components/ui'
import type { PlanCode, SubscriptionPlan, User } from '../../types'

const features = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') return [value]
  return []
}

export default function BillingPage() {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const plansQuery = useQuery({
    queryKey: ['billing-plans'],
    queryFn: async () => {
      const { data } = await api.get<{ plans: SubscriptionPlan[] }>('/billing/plans')
      return data.plans
    },
  })

  const upgradeMutation = useMutation({
    mutationFn: async (plan: PlanCode) => {
      const { data } = await api.post<{ user: Pick<User, 'id' | 'plan' | 'apiCallsUsed' | 'apiCallsLimit'> }>('/billing/upgrade', { plan })
      return data.user
    },
    onSuccess: (updated) => {
      if (user) setUser({ ...user, ...updated })
      toast.success(`Plan updated to ${updated.plan}`)
    },
  })

  const usagePercent = user ? Math.min(100, Math.round((user.apiCallsUsed / Math.max(1, user.apiCallsLimit)) * 100)) : 0

  return (
    <div className="page-shell">
      <div className="page-title"><h1>Billing</h1><p>Choose the analysis capacity and export features that fit your SEO workflow.</p></div>
      <Card className="usage-card">
        <div><h2>Current plan: {user?.plan ?? 'FREE'}</h2><p>{formatNumber(user?.apiCallsUsed)} of {formatNumber(user?.apiCallsLimit)} analysis credits used</p></div>
        <Progress value={usagePercent} />
      </Card>
      {plansQuery.isLoading ? <Spinner /> : plansQuery.data?.length ? (
        <div className="pricing-grid">
          {plansQuery.data.map((plan) => (
            <Card className={plan.highlighted ? 'plan-card is-highlighted' : 'plan-card'} key={plan.code}>
              {plan.highlighted ? <Badge tone="info"><Crown size={14} /> Popular</Badge> : null}
              <h2>{plan.name}</h2>
              <p className="price">${plan.priceMonthly}<span>/mo</span></p>
              <p>{formatNumber(plan.analysesLimit)} analyses included</p>
              <ul className="bullet-list">
                {features(plan.features).map((item) => <li key={item}><Check size={15} /> {item}</li>)}
              </ul>
              <Button disabled={upgradeMutation.isPending || user?.plan === plan.code} onClick={() => upgradeMutation.mutate(plan.code)} variant={user?.plan === plan.code ? 'secondary' : 'primary'}>
                {user?.plan === plan.code ? 'Current plan' : 'Upgrade'}
              </Button>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="No plans available" />}
    </div>
  )
}
