'use client'

import { useState } from 'react'
import AliExpress1688Ingestion from '@/components/admin/AliExpress1688Ingestion'
import UsedProductIngestion from '@/components/admin/UsedProductIngestion'

type Tab = 'used' | 'aliexpress'

export default function AdminIngestionHub() {
  const [tab, setTab] = useState<Tab>('used')

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('used')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              tab === 'used'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Idle Fish / Occasion
          </button>
          <button
            type="button"
            onClick={() => setTab('aliexpress')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              tab === 'aliexpress'
                ? 'bg-blue-700 text-white'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            AliExpress / 1688 (URL)
          </button>
        </div>
      </div>

      {tab === 'used' ? <UsedProductIngestion /> : <AliExpress1688Ingestion />}
    </div>
  )
}
