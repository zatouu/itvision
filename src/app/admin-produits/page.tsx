import ProductAdminInterface from '@/components/ProductAdminInterface'

export default function AdminProduitsPage() {
  return (
    <div className="pt-16 bg-gray-50 min-h-screen"> {/* Compensation pour le header fixe */}
      <ProductAdminInterface />
    </div>
  )
}