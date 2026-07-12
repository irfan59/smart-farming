import { Icons } from './icons';

// Safe icon renderer — unknown names render nothing instead of crashing.
export default function Icon({ name, size = 20, color, strokeWidth = 2, style }) {
  const Cmp = Icons[name];
  if (!Cmp) return null;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} style={style} />;
}
