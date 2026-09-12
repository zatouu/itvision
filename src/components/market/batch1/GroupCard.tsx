import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from './Card';
import { Button } from './Button';
import { ProgressBar } from './ProgressBar';
import { Icon } from './Icon';
import { formatFcfa } from './formatFcfa';
import type { Group } from './types';

export interface GroupCardProps {
  group: Group;
  className?: string;
  onClick?: () => void;
}

export function GroupCard({ group, className, onClick }: GroupCardProps) {
  const [imageError, setImageError] = useState(false);
  const pct =
    group.targetQty > 0
      ? Math.round((group.currentQty / group.targetQty) * 100)
      : 0;
  const almost = group.status === 'almost';
  const joinable = group.status === 'live' || group.status === 'almost';

  return (
    <Card
      onClick={onClick}
      className={cn(
        'group overflow-hidden transition-shadow hover:shadow-md',
        onClick ? 'cursor-pointer' : 'cursor-default',
        className
      )}
    >
      <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800">
        {group.image && !imageError ? (
          <img
            src={group.image}
            alt={group.name}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <Icon name="package" size={28} />
            <span className="text-[10px] mt-1">Image indisponible</span>
          </div>
        )}

        <div className="absolute left-2 top-2">
          {almost ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
              <Icon name="flame" size={9} />
              Presque plein
            </span>
          ) : group.status === 'filled' ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-slate-800/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
              <Icon name="check" size={9} />
              Complet
            </span>
          ) : !joinable ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-slate-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
              {group.status === 'cancelled' ? 'Annulé' : group.status === 'delivered' ? 'Livré' : group.status === 'shipped' ? 'Expédié' : 'En cours'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-white/95 px-1.5 py-0.5 text-[9px] font-bold text-slate-900 dark:bg-slate-900/95 dark:text-white">
              <span
                className="h-1.5 w-1.5 rounded-full animate-ping bg-red-500"
                style={{ animationDuration: '2s' }}
              />
              Live
            </span>
          )}
        </div>
      </div>

      <div className="p-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
            {group.category}
          </p>
          <span className="inline-flex flex-shrink-0 items-center gap-0.5 whitespace-nowrap text-[10px] font-bold tabular-nums text-red-600 dark:text-red-400">
            <Icon name="clock" size={10} />
            {group.deadline}
          </span>
        </div>

        <p className="mt-0.5 min-h-[32px] text-[12.5px] font-extrabold leading-tight text-slate-900 dark:text-white line-clamp-2">
          {group.name}
        </p>

        <div className="mt-2">
          <ProgressBar
            value={group.currentQty}
            max={group.targetQty}
            tone="mixed"
            className="!h-1.5"
          />
          <div className="mt-1 flex items-center justify-between text-[10px] font-semibold tabular-nums text-slate-500 dark:text-slate-400">
            <span>
              <b className="text-slate-900 dark:text-white">{group.currentQty}</b>
              /{group.targetQty} pcs
            </span>
            <span>{pct}%</span>
          </div>
        </div>

        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="whitespace-nowrap text-[15px] font-extrabold tabular-nums text-violet-700 dark:text-violet-300">
            {formatFcfa(group.unit)}
          </span>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            -{group.save}%
          </span>
        </div>

        <div className="mt-2">
          <Button variant={joinable ? 'violet' : 'secondary'} size="sm" className="w-full !h-8 !text-xs">
            {joinable ? 'Rejoindre' : 'Voir'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
