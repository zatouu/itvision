import ProjectManagementSystem from '@/components/ProjectManagementSystem'

export default function GestionProjetsPage() {
  return (
    <div className="pt-16 bg-gray-50 min-h-screen"> {/* Compensation pour le header fixe */}
      <ProjectManagementSystem />
    </div>
  )
}