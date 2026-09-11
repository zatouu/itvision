import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Boxes,
  Camera,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Clock,
  Copy,
  Eye,
  Filter,
  Flame,
  Gift,
  Heart,
  Home,
  Info,
  LayoutGrid,
  Lock,
  MapPin,
  MessageCircle,
  Minus,
  Monitor,
  Moon,
  Package,
  Plane,
  Plus,
  Search,
  Send,
  Share,
  Shield,
  Ship,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Star,
  Sun,
  Target,
  Trash,
  TrendingUp,
  Truck,
  User,
  Users,
  Wallet,
  X,
  type LucideProps,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = {
  home: Home,
  grid: LayoutGrid,
  users: Users,
  cart: ShoppingCart,
  user: User,
  search: Search,
  heart: Heart,
  camera: Camera,
  package: Package,
  clock: Clock,
  check: Check,
  checkCircle: CheckCircle,
  shield: Shield,
  truck: Truck,
  plane: Plane,
  ship: Ship,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  plus: Plus,
  minus: Minus,
  x: X,
  trash: Trash,
  info: Info,
  sparkles: Sparkles,
  trending: TrendingUp,
  boxes: Boxes,
  share: Share,
  copy: Copy,
  message: MessageCircle,
  whatsapp: MessageCircle,
  bell: Bell,
  moon: Moon,
  sun: Sun,
  smartphone: Smartphone,
  monitor: Monitor,
  filter: Filter,
  star: Star,
  flame: Flame,
  target: Target,
  gift: Gift,
  mapPin: MapPin,
  wallet: Wallet,
  lock: Lock,
  eye: Eye,
  send: Send,
  chevronsRight: ChevronsRight,
} as const;

export type IconName = keyof typeof ICONS;

export interface IconProps extends Omit<LucideProps, 'size' | 'name'> {
  name: IconName | (string & {});
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function Icon({
  name,
  size = 20,
  className,
  strokeWidth = 2,
  ...rest
}: IconProps) {
  const LucideIconComponent = ICONS[name as IconName];
  if (!LucideIconComponent) return null;
  return (
    <LucideIconComponent
      size={size}
      className={cn(className)}
      strokeWidth={strokeWidth}
      {...rest}
    />
  );
}
