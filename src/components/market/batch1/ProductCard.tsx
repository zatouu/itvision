import Image from 'next/image';
import { cn } from '@/lib/utils';
import { formatFcfa } from './formatFcfa';
import { Card } from './Card';
import { Badge } from './Badge';
import { Icon } from './Icon';
import type { Product } from './types';

export type ProductCardSize = 'sm' | 'lg';

export interface ProductCardProps {
  product: Product;
  size?: ProductCardSize;
  className?: string;
}

function getProductImage(product: Product): string {
  return product.img || product.image || product.images?.[0] || '';
}

export function ProductCard({
  product,
  size = 'sm',
  className,
}: ProductCardProps) {
  const image = getProductImage(product);
  const category = product.cat || product.category || '';
  const moq = product.moq ?? product.minOrderQty ?? 1;
  const basePrice = product.basePrice ?? product.base ?? 0;
  const isLg = size === 'lg';

  return (
    <Card
      className={cn(
        'group cursor-pointer overflow-hidden transition-shadow hover:shadow-md',
        className
      )}
    >
      <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
        {image && (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}

        <div className="absolute left-2 top-2 flex flex-col gap-1">
          <Badge tone="amber" className="text-[10px]">
            <Icon name="package" size={10} />
            Min. {moq}
          </Badge>
          {product.hasGroup && (
            <Badge tone="violet" className="text-[10px]">
              <Icon name="users" size={10} />
              Groupe
            </Badge>
          )}
        </div>

        <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
          {product.save != null && (
            <span className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              -{product.save}%
            </span>
          )}
          {product.verified && (
            <span
              className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white"
              title="Fournisseur vérifié"
            >
              <Icon name="checkCircle" size={11} />
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-slate-700 shadow-sm hover:bg-white dark:bg-slate-900/95 dark:text-slate-300 dark:hover:bg-slate-900"
          aria-label="Ajouter aux favoris"
        >
          <Icon name="heart" size={14} />
        </button>
      </div>

      <div className={cn('p-2.5', isLg && 'md:p-3')}>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {category}
        </p>
        <p
          className={cn(
            'mt-0.5 font-semibold text-slate-900 dark:text-white line-clamp-2 leading-tight',
            isLg ? 'min-h-[34px] text-[13px]' : 'min-h-[30px] text-[12px]'
          )}
        >
          {product.name}
        </p>

        <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
          <Icon
            name="star"
            size={10}
            strokeWidth={0}
            fill="currentColor"
            className="fill-amber-500 text-amber-500"
          />
          <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
            {product.rating}
          </span>
        </div>

        <div className="mt-1.5 flex items-baseline gap-1.5 whitespace-nowrap">
          <span
            className={cn(
              'font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400',
              isLg ? 'text-[15px]' : 'text-[14px]'
            )}
          >
            {formatFcfa(product.price)}
          </span>
          <span className="text-[10px] font-semibold text-slate-400 line-through tabular-nums">
            {formatFcfa(basePrice)}
          </span>
        </div>
      </div>
    </Card>
  );
}
