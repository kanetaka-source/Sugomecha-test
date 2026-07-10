import { useNavigate } from 'react-router-dom'
import { ProgressRing } from './ProgressRing'
import { IconBook, IconUserCrowd, IconProgress, IconVehicle, getCourseIcon } from './icons'
import type { TrainingCourse } from '../lib/api'

const actions = [
  { label: '自己評価', Icon: IconBook },
  { label: '作業待ち', Icon: IconUserCrowd },
  { label: '進捗状況', Icon: IconProgress },
]

export function TrainingCard({ course, progress = 0 }: { course: TrainingCourse; progress?: number }) {
  const navigate = useNavigate()
  const CenterIcon = getCourseIcon(course.icon)?.Icon ?? IconVehicle

  function onAction(label: string) {
    if (label === '自己評価') {
      navigate(`/jiko-hyoka?category=${encodeURIComponent(course.name)}`)
    } else if (label === '作業待ち') {
      navigate(`/machi?category=${encodeURIComponent(course.name)}`)
    } else if (label === '進捗状況') {
      navigate(`/shinchoku?category=${encodeURIComponent(course.name)}`)
    }
  }

  return (
    <div className="card-grad bg-surface p-4 shadow-sm">
      <div className="flex justify-center py-2">
        <ProgressRing value={progress} size={132} stroke={12}>
          <div className="leading-tight">
            <div className="text-sm font-bold text-muted">{course.name}</div>
            <CenterIcon className="mx-auto my-1 h-9 w-9 text-muted" />
            <div className="text-[11px] text-muted">進捗</div>
            <div className="text-sm font-bold text-ink2">{progress}%</div>
          </div>
        </ProgressRing>
      </div>
      <div className="mt-2 flex gap-1.5">
        {actions.map(({ label, Icon }) => (
          <button
            key={label}
            onClick={() => onAction(label)}
            className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md bg-accent px-1 py-2 text-[10px] font-bold text-white hover:brightness-95"
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
