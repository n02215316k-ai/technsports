'use client';

import Link from 'next/link';
import { BarChart3, Menu, Radio, UserRound } from 'lucide-react';
import { useState } from 'react';
import { GlobalSearch } from './search';
import { OfflineManager } from './offline-manager';
import { usePathname } from 'next/navigation';
import { AccountMenu } from './account-menu';

const nav = [['Scores','/scores'],['Fixtures','/fixtures'],['Table','/table'],['Players','/players'],['Contributors','/contributors'],['Transfers','/transfers'],['News','/news']];

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return <><OfflineManager/>
    <div className="signal-bar"><span><Radio size={13}/> LIVE DATA NETWORK</span><span>Zimbabwe Premier Soccer League · 3 matches active</span></div>
    <header className="site-header">
      <Link className="brand" href="/"><span className="brand-mark"><BarChart3/></span><span>TECHN<span>SPORTS</span></span></Link>
      <nav className={open ? 'nav open' : 'nav'}>{nav.map(([label,href]) => <Link className={pathname===href?'active':''} key={label} href={href} onClick={() => setOpen(false)}>{label}</Link>)}</nav>
      <div className="header-actions"><GlobalSearch/><Link className="contribute" href="/contribute"><UserRound size={16}/> Contribute</Link><AccountMenu/><button className="menu" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}><Menu/></button></div>
    </header>
  </>;
}
