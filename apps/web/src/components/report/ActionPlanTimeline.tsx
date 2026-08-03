import { Badge, Card, DataBadge } from '../ui'

export type ActionPlanPhase = {
  phase?: string
  theme?: string
  tasks?: Array<{
    title?: string
    priority?: 'high' | 'medium' | 'low' | string
    owner?: string
    expectedImpact?: string
    effort?: string
  }>
}

export function ActionPlanTimeline({ phases }: { phases: ActionPlanPhase[] }) {
  return (
    <div className="timeline">
      {phases.map((phase, index) => (
        <Card className="timeline__item" key={`${phase.phase}-${index}`}>
          <div className="timeline__marker">{index + 1}</div>
          <div className="inline-cluster">
            <h3>{phase.phase ?? `Phase ${index + 1}`}</h3>
            <DataBadge confidence="AI_GENERATED" />
          </div>
          <p>{phase.theme}</p>
          <div className="task-list">
            {(phase.tasks ?? []).map((task, taskIndex) => (
              <div className="task" key={`${task.title}-${taskIndex}`}>
                <Badge tone={task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'info'}>
                  {task.priority ?? 'medium'}
                </Badge>
                <div>
                  <strong>{task.title}</strong>
                  <small>
                    {task.owner ?? 'Team'} · {task.effort ?? 'medium'} effort · {task.expectedImpact}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
