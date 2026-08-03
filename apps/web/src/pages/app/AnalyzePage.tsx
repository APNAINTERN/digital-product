import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Bot, FileSearch, Gauge, Globe, Search, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { normalizeUrlInput } from '../../lib/utils'
import { useReportStatus } from '../../hooks/useReportStatus'
import { Button, Card, Input, Progress, Spinner } from '../../components/ui'

const steps = [
  { label: 'Crawling', threshold: 5, icon: Globe },
  { label: 'Technical SEO', threshold: 30, icon: Gauge },
  { label: 'Content', threshold: 48, icon: FileSearch },
  { label: 'Competitors', threshold: 68, icon: Search },
  { label: 'AI Advisor', threshold: 80, icon: Bot },
]

export default function AnalyzePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [reportId, setReportId] = useState(params.get('id'))
  const [submitting, setSubmitting] = useState(false)
  const statusQuery = useReportStatus(reportId)

  useEffect(() => {
    if (statusQuery.data?.status === 'COMPLETED' && reportId) {
      navigate(`/app/reports/${reportId}`)
    }
    if (statusQuery.data?.status === 'FAILED') {
      toast.error(statusQuery.data.errorMessage ?? 'Analysis failed')
    }
  }, [navigate, reportId, statusQuery.data])

  const progress = statusQuery.data?.progress ?? 0
  const activeStep = useMemo(() => steps.filter((step) => progress >= step.threshold).length - 1, [progress])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!url.trim()) return
    setSubmitting(true)
    try {
      const { data } = await api.post<{ reportId: string }>('/analyze', { url: normalizeUrlInput(url) })
      setReportId(data.reportId)
      navigate(`/app/analyze?id=${data.reportId}`, { replace: true })
      toast.success('Analysis started')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start analysis')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-shell narrow">
      <motion.div animate={{ opacity: 1, y: 0 }} className="analyze-hero" initial={{ opacity: 0, y: 16 }}>
        <Sparkles size={34} />
        <h1>Analyze any website in minutes</h1>
        <p>SEO Vision AI crawls the page, scores key growth signals, benchmarks competitors, and builds an action plan.</p>
        <form className="analyzer-form analyzer-form--large" onSubmit={submit}>
          <Input onChange={(event) => setUrl(event.target.value)} placeholder="example.com or https://example.com" value={url} />
          <Button disabled={submitting} size="lg" type="submit">
            {submitting ? <Spinner label="Queueing" /> : 'Start analysis'}
          </Button>
        </form>
      </motion.div>

      {reportId ? (
        <Card className="loading-pipeline">
          <div className="section-heading">
            <div>
              <h2>Analysis in progress</h2>
              <p>{statusQuery.data?.statusMessage ?? 'Preparing crawler and scoring models.'}</p>
            </div>
            <strong>{Math.round(progress)}%</strong>
          </div>
          <Progress value={progress} />
          <div className="pipeline-steps">
            {steps.map((step, index) => {
              const Icon = step.icon
              const complete = progress >= step.threshold
              const active = index === Math.max(0, activeStep)
              return (
                <motion.div
                  animate={{ scale: active ? 1.04 : 1 }}
                  className={complete ? 'pipeline-step is-complete' : 'pipeline-step'}
                  key={step.label}
                >
                  <Icon size={22} />
                  <strong>{step.label}</strong>
                  <span>{complete ? 'Running' : 'Queued'}</span>
                </motion.div>
              )
            })}
          </div>
          {statusQuery.data?.status === 'FAILED' ? (
            <div className="error-box">{statusQuery.data.errorMessage ?? 'Analysis failed. Please try another URL.'}</div>
          ) : null}
        </Card>
      ) : null}
    </div>
  )
}
