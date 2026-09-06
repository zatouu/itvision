import InvoiceGenerator from '@/components/InvoiceGenerator'

export default function AdminFacturesPage() {
  return (
    <div className="pt-16 bg-gray-50 min-h-screen"> {/* Compensation pour le header fixe */}
      <InvoiceGenerator />
    </div>
  )
}