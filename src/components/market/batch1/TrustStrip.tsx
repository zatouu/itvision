import { cn } from '@/lib/utils';
import { Icon, type IconName } from './Icon';

export interface TrustStripProps {
  compact?: boolean;
  className?: string;
}

const items: { icon: IconName; label: string; sub: string }[] = [
  { icon: 'shield', label: 'Paiement sécurisé', sub: 'Escrow Mobile Money' },
  { icon: 'truck', label: 'Livraison suivie', sub: 'Dakar & régions' },
  { icon: 'checkCircle', label: 'Inspection Chine', sub: 'Avant expédition' },
  { icon: 'message', label: 'Support 7j/7', sub: 'WhatsApp direct' },
];

export function TrustStrip({ compact = false, className }: TrustStripProps) {
  return (
    <div
      className={cn(
        'grid gap-2',
        compact ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-4',
        className
      )}
    >
      {items.map((it) => (
        <div
          key={it.label}
          className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Icon name={it.icon} size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-bold leading-tight text-slate-900 dark:text-white">
              {it.label}
            </p>
            <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">
              {it.sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
