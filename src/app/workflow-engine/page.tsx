import WorkflowEngine from '@/components/WorkflowEngine'

export default function WorkflowEnginePage() {
  return (
    <div className="pt-16 bg-gray-50 min-h-screen"> {/* Compensation pour le header fixe */}
      <WorkflowEngine />
    </div>
  )
}