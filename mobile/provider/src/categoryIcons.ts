import { Zap, Wrench, Hammer, Paintbrush, Wind, ShieldCheck, Sparkles, Truck, Briefcase } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  electricite: Zap,
  plomberie: Wrench,
  menuiserie: Hammer,
  peinture: Paintbrush,
  climatisation: Wind,
  securite: ShieldCheck,
  nettoyage: Sparkles,
  demenagement: Truck,
}

export function getCategoryIcon(slug: string | undefined | null): LucideIcon {
  if (slug && CATEGORY_ICON_MAP[slug]) return CATEGORY_ICON_MAP[slug]
  return Briefcase
}
