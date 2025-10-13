import IntelligentQuoteGenerator from '@/components/IntelligentQuoteGenerator'

export default function GenerateurDevisPage() {
  return (
    <div className="pt-16 bg-gray-50 min-h-screen"> {/* Compensation pour le header fixe */}
      <IntelligentQuoteGenerator />
    </div>
  )
}