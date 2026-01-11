'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import clsx from 'clsx'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  CheckCircle,
  Zap,
  Shield,
  Award,
  Package,
  Ruler,
  Cpu,
  Gauge,
  FileDown,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Layers,
  Target,
  Home,
  Building2,
  Wrench,
  Play,
  X,
  ZoomIn
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export interface RichContentBlock {
  type: 'hero' | 'features' | 'specs' | 'comparison' | 'scenarios' | 'gallery' | 'video' | 'cta'
  title?: string
  subtitle?: string
  data: any
}

export interface FeatureHighlight {
  icon?: string
  title: string
  description: string
  image?: string
  badge?: string
}

export interface SpecGroup {
  name: string
  specs: { label: string; value: string }[]
}

export interface UsageScenario {
  id: string
  title: string
  description: string
  icon: 'home' | 'business' | 'pro' | 'custom'
  image: string
  features: string[]
}

export interface ProductRichContentProps {
  /** Blocs de contenu riche */
  blocks: RichContentBlock[]
  /** Caractéristiques produit */
  features?: string[]
  /** Groupes de spécifications */
  specGroups?: SpecGroup[]
  /** Scénarios d'utilisation */
  scenarios?: UsageScenario[]
  /** Images descriptives (type 1688) */
  richImages?: string[]
  /** Vidéo produit */
  videoUrl?: string
  /** URL fiche technique PDF */
  datasheetUrl?: string
  /** Classe CSS */
  className?: string
}

// ============================================================================
// SOUS-COMPOSANTS
// ============================================================================

function AnimatedFeatureCard({ feature, index }: { feature: FeatureHighlight; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  const iconMap: { [key: string]: React.ElementType } = {
    speed: Zap,
    security: Shield,
    quality: Award,
    package: Package,
    size: Ruler,
    performance: Cpu,
    gauge: Gauge,
    default: CheckCircle
  }

  const Icon = iconMap[feature.icon || 'default'] || CheckCircle

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:border-emerald-200 transition-all duration-300"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
          <Icon className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900">{feature.title}</h4>
            {feature.badge && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                {feature.badge}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{feature.description}</p>
        </div>
      </div>
      {feature.image && (
        <div className="mt-4 rounded-xl overflow-hidden">
          <Image
            src={feature.image}
            alt={feature.title}
            width={400}
            height={200}
            className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}
    </motion.div>
  )
}

function SpecsTable({ groups }: { groups: SpecGroup[] }) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(groups[0]?.name || null)

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div
          key={group.name}
          className="bg-white rounded-xl border border-gray-100 overflow-hidden"
        >
          <button
            onClick={() => setExpandedGroup(expandedGroup === group.name ? null : group.name)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
          >
            <span className="font-semibold text-gray-900">{group.name}</span>
            <ChevronDown
              className={clsx(
                'w-5 h-5 text-gray-400 transition-transform',
                expandedGroup === group.name && 'rotate-180'
              )}
            />
          </button>
          <AnimatePresence>
            {expandedGroup === group.name && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-2">
                  {group.specs.map((spec, idx) => (
                    <div
                      key={idx}
                      className={clsx(
                        'flex justify-between py-2 text-sm',
                        idx !== group.specs.length - 1 && 'border-b border-gray-100'
                      )}
                    >
                      <span className="text-gray-500">{spec.label}</span>
                      <span className="font-medium text-gray-900">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}

function ScenarioCard({ scenario, isActive, onClick }: { scenario: UsageScenario; isActive: boolean; onClick: () => void }) {
  const iconMap = {
    home: Home,
    business: Building2,
    pro: Wrench,
    custom: Target
  }
  const Icon = iconMap[scenario.icon]

  return (
    <motion.button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-3 p-4 rounded-xl border-2 transition-all w-full text-left',
        isActive
          ? 'border-emerald-500 bg-emerald-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className={clsx(
          'w-10 h-10 rounded-lg flex items-center justify-center',
          isActive ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className={clsx('font-semibold', isActive ? 'text-emerald-700' : 'text-gray-900')}>
          {scenario.title}
        </h4>
        <p className="text-xs text-gray-500 line-clamp-1">{scenario.description}</p>
      </div>
    </motion.button>
  )
}

function RichImageGallery({ images }: { images: string[] }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  return (
    <>
      <div className="space-y-4">
        {images.map((image, idx) => {
          const ref = useRef(null)
          const isInView = useInView(ref, { once: true, margin: '-100px' })

          return (
            <motion.div
              key={idx}
              ref={ref}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="relative group cursor-pointer"
              onClick={() => setSelectedImage(image)}
            >
              <Image
                src={image}
                alt={`Description ${idx + 1}`}
                width={800}
                height={600}
                className="w-full h-auto rounded-2xl shadow-sm"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition rounded-2xl flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition bg-white/90 backdrop-blur px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium text-gray-700">
                  <ZoomIn className="w-4 h-4" />
                  Agrandir
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Modal zoom */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <Image
              src={selectedImage}
              alt="Zoom"
              width={1400}
              height={1000}
              className="max-w-full max-h-[90vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function VideoPlayer({ url, thumbnail }: { url: string; thumbnail?: string }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  return (
    <>
      <div
        className="relative aspect-video rounded-2xl overflow-hidden bg-gray-900 cursor-pointer group"
        onClick={() => setShowModal(true)}
      >
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt="Video thumbnail"
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
        )}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="w-20 h-20 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-2xl"
          >
            <Play className="w-8 h-8 text-emerald-600 ml-1" />
          </motion.div>
        </div>
        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur text-white text-sm px-3 py-1.5 rounded-full">
          Voir la vidéo produit
        </div>
      </div>

      {/* Video modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
              <video
                ref={videoRef}
                src={url}
                controls
                autoPlay
                className="w-full rounded-xl"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function ProductRichContent({
  blocks,
  features = [],
  specGroups = [],
  scenarios = [],
  richImages = [],
  videoUrl,
  datasheetUrl,
  className
}: ProductRichContentProps) {
  const [activeScenario, setActiveScenario] = useState<string | null>(scenarios[0]?.id || null)
  const activeScenarioData = scenarios.find((s) => s.id === activeScenario)

  // Default features if none provided
  const displayFeatures: FeatureHighlight[] = features.length > 0
    ? features.map((f) => ({ title: f, description: '', icon: 'default' }))
    : []

  return (
    <div className={clsx('space-y-12', className)}>
      {/* Video section */}
      {videoUrl && (
        <section>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Play className="w-5 h-5 text-emerald-600" />
            Vidéo produit
          </h3>
          <VideoPlayer url={videoUrl} />
        </section>
      )}

      {/* Features highlights */}
      {displayFeatures.length > 0 && (
        <section>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-600" />
            Points forts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayFeatures.map((feature, idx) => (
              <AnimatedFeatureCard key={idx} feature={feature} index={idx} />
            ))}
          </div>
        </section>
      )}

      {/* Specifications */}
      {specGroups.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              Caractéristiques techniques
            </h3>
            {datasheetUrl && (
              <a
                href={datasheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                <FileDown className="w-4 h-4" />
                Télécharger PDF
              </a>
            )}
          </div>
          <SpecsTable groups={specGroups} />
        </section>
      )}

      {/* Usage scenarios */}
      {scenarios.length > 0 && (
        <section>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600" />
            Cas d'utilisation
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Scenario selector */}
            <div className="lg:col-span-1 space-y-2">
              {scenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  isActive={activeScenario === scenario.id}
                  onClick={() => setActiveScenario(scenario.id)}
                />
              ))}
            </div>

            {/* Scenario detail */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {activeScenarioData && (
                  <motion.div
                    key={activeScenarioData.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                  >
                    <div className="relative aspect-video">
                      <Image
                        src={activeScenarioData.image}
                        alt={activeScenarioData.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="p-6">
                      <h4 className="text-lg font-bold text-gray-900 mb-2">
                        {activeScenarioData.title}
                      </h4>
                      <p className="text-gray-600 mb-4">{activeScenarioData.description}</p>
                      <ul className="space-y-2">
                        {activeScenarioData.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>
      )}

      {/* Rich images (1688 style) */}
      {richImages.length > 0 && (
        <section>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            Description détaillée
          </h3>
          <RichImageGallery images={richImages} />
        </section>
      )}

      {/* Download CTA */}
      {datasheetUrl && (
        <section className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-gray-900">Fiche technique complète</h4>
            <p className="text-sm text-gray-600">Téléchargez le PDF avec toutes les spécifications</p>
          </div>
          <a
            href={datasheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition whitespace-nowrap"
          >
            <FileDown className="w-5 h-5" />
            Télécharger
          </a>
        </section>
      )}
    </div>
  )
}
