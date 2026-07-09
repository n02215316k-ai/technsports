import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export function SectionHead({ eyebrow, title, action, href }: { eyebrow?: string, title: string, action?: string, href?: string }) {
  const target = href ?? ({ 'Full table': '/table', 'Explore all players': '/players', 'Transfer centre': '/transfers', 'All stories': '/news', 'All fixtures': '/fixtures' } as Record<string,string>)[action ?? ''];
  return <div className="section-head"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>{action && target && <Link className="text-link" href={target}>{action}<ChevronRight size={16}/></Link>}</div>;
}

export function TeamBadge({ short, color='#0d7d55', small=false }: { short: string, color?: string, small?: boolean }) {
  return <span className={small ? 'team-badge small' : 'team-badge'} style={{'--team': color} as React.CSSProperties}>{short.slice(0,3)}</span>;
}

export function Card({ children, className='' }: {children: ReactNode, className?: string}) {
  return <div className={`card ${className}`}>{children}</div>;
}
