'use client';

import Link from 'next/link';
import { BookOpen, ClipboardCheck, Database, FileEdit, ShieldCheck, UserCog, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';

type User={displayName:string;username:string;email:string;role:string;createdAt:string};

export default function Account(){
  const api=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000/api/v1';
  const [user,setUser]=useState<User|null|undefined>(undefined);
  useEffect(()=>{fetch(`${api}/auth/me`,{credentials:'include'}).then(r=>r.json()).then(d=>setUser(d.user??null)).catch(()=>setUser(null))},[api]);
  if(user===undefined)return <main className="page-shell"><p>Loading account…</p></main>;
  if(!user)return <main className="page-shell auth-required"><UserRound/><h1>Sign in required</h1><Link href="/signin">Sign in</Link></main>;
  const tools=[
    {roles:['COLLECTOR','REVIEWER','EDITOR','ADMIN'],href:'/contribute',label:'Contributor workbench',icon:<ClipboardCheck/>},
    {roles:['COLLECTOR','REVIEWER','EDITOR','ADMIN'],href:'/contribute/transfers',label:'Submit transfer report',icon:<BookOpen/>},
    {roles:['REVIEWER','EDITOR','ADMIN'],href:'/review',label:'Review queue',icon:<ShieldCheck/>},
    {roles:['EDITOR','ADMIN'],href:'/admin/articles/new',label:'Write article',icon:<FileEdit/>},
    {roles:['ADMIN'],href:'/admin',label:'Data administration',icon:<Database/>},
    {roles:['ADMIN'],href:'/admin/users',label:'User roles',icon:<UserCog/>}
  ];
  return <main className="page-shell"><div className="account-header"><i>{user.displayName.split(' ').map(x=>x[0]).join('').slice(0,2)}</i><div><span>{user.role}</span><h1>{user.displayName}</h1><p>@{user.username} · {user.email} · Member since {new Date(user.createdAt).toLocaleDateString('en-ZW')}</p></div></div><div className="records-heading"><div><span className="eyebrow">AVAILABLE TOOLS</span><h2>Your workspace</h2></div></div><div className="role-tools">{tools.filter(t=>t.roles.includes(user.role)).map(t=><Link href={t.href} key={t.href}>{t.icon}<b>{t.label}</b><span>Open ›</span></Link>)}{!tools.some(t=>t.roles.includes(user.role))&&<div className="supporter-panel"><ShieldCheck/><b>Supporter account</b><p>Public scores, fixtures, tables, players, clubs and news are available from the main navigation.</p></div>}</div></main>
}
