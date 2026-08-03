import { DataBadge } from '../ui'

type Point = {
  label?: string
  value?: number
}

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const hours = ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM']

export function HeatmapGrid({ peakHours = [], peakDays = [] }: { peakHours?: Point[]; peakDays?: Point[] }) {
  const hourMap = new Map(peakHours.map((item) => [item.label, item.value ?? 0]))
  const dayMap = new Map(peakDays.map((item) => [item.label, item.value ?? 0]))
  const max = Math.max(...peakHours.map((item) => item.value ?? 0), ...peakDays.map((item) => item.value ?? 0), 1)

  return (
    <div className="heatmap-card">
      <div className="chart-card__header">
        <h3>Visitor time analysis</h3>
        <DataBadge confidence="ESTIMATED" />
      </div>
      <div className="heatmap">
        <span />
        {hours.map((hour) => (
          <strong key={hour}>{hour}</strong>
        ))}
        {days.map((day, dayIndex) => (
          <div className="heatmap__row" key={day}>
            <strong>{day}</strong>
            {hours.map((hour, hourIndex) => {
              const dayValue = dayMap.get(day) ?? 10
              const hourValue = hourMap.get(hour) ?? 10
              const value = Math.round((dayValue * 0.55 + hourValue * 0.45 + ((dayIndex + hourIndex) % 4) * 4))
              const opacity = Math.max(0.16, Math.min(0.95, value / max))
              return (
                <span
                  aria-label={`${day} ${hour}: ${value}`}
                  key={`${day}-${hour}`}
                  style={{ backgroundColor: `rgba(34, 211, 238, ${opacity})` }}
                  title={`${day} ${hour}: ${value}`}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
