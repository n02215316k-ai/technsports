'use client';

import Link from 'next/link';
import { BarChart3, Menu, Radio, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { GlobalSearch } from './search';
import { OfflineManager } from './offline-manager';
import { usePathname } from 'next/navigation';
import { AccountMenu } from './account-menu';

const nav = [['Scores','/scores'],['Fixtures','/fixtures'],['Tickets','/tickets'],['Table','/table'],['Players','/players'],['Contributors','/contributors'],['Transfers','/transfers'],['News','/news']];
type User={role:'SUPPORTER'|'COLLECTOR'|'REVIEWER'|'EDITOR'|'ADMIN'};

export function Header() {
  const [open, setOpen] = useState(false);
  const [user,setUser]=useState<User|null>(null);
  const [liveCount,setLiveCount]=useState<number|null>(null);
  const pathname = usePathname();
  const api=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000/api/v1';
  const loadUser=useCallback(()=>{fetch(`${api}/auth/me`,{credentials:'include'}).then(r=>r.json()).then(data=>setUser(data.user??null)).catch(()=>setUser(null))},[api]);
  useEffect(()=>{loadUser();window.addEventListener('technsports-auth-change',loadUser);return()=>window.removeEventListener('technsports-auth-change',loadUser)},[loadUser]);
  useEffect(()=>{fetch(`${api}/public/matches?limit=80`).then(r=>r.json()).then((matches:{status:string}[])=>setLiveCount(matches.filter(match=>match.status==='LIVE').length)).catch(()=>setLiveCount(null))},[api]);
  const opsNav=useMemo(()=>{const role=user?.role;const links:string[][]=[];if(role&&['COLLECTOR','REVIEWER','EDITOR','ADMIN'].includes(role))links.push(['Collect','/contribute']);if(role&&['REVIEWER','EDITOR','ADMIN'].includes(role))links.push(['Review','/review']);if(role&&['EDITOR','ADMIN'].includes(role))links.push(['Write','/admin/articles/new']);if(role==='ADMIN')links.push(['Admin','/admin']);return links},[user]);
  const actionHref=user?'/account':'/signup';
  const actionLabel=user&&['COLLECTOR','REVIEWER','EDITOR','ADMIN'].includes(user.role)?'Workspace':user?'Account':'Join network';
  return <><OfflineManager/>
    <div className="signal-bar"><span><Radio size={13}/> LIVE DATA NETWORK</span><span>{liveCount===null?'Zimbabwe football intelligence':`${liveCount} live match${liveCount===1?'':'es'} active`}</span></div>
    <header className="site-header">
      <Link className="brand" href="/"><span className="brand-mark"><BarChart3/></span><span>TECHN<span>SPORTS</span></span></Link>
      <nav className={open ? 'nav open' : 'nav'}>{[...nav,...opsNav].map(([label,href]) => <Link className={pathname===href?'active':''} key={`${label}-${href}`} href={href} onClick={() => setOpen(false)}>{label}</Link>)}</nav>
      <div className="header-actions"><GlobalSearch/><Link className="contribute" href={actionHref}><UserRound size={16}/> {actionLabel}</Link><AccountMenu/><button className="menu" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}><Menu/></button></div>
    </header>
  </>;
}
