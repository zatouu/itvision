import ProductAdminInterface from '@/components/ProductAdminInterface'
import Breadcrumb from '@/components/Breadcrumb'

export default function AdminProduitsPage() {
  return (
    <div className="pt-16 bg-gray-50 min-h-screen"> {/* Compensation pour le header fixe */}
      <Breadcrumb 
        backHref="/" 
        backLabel="Retour à l'accueil"
      />
      <ProductAdminInterface />
    </div>
  )
}