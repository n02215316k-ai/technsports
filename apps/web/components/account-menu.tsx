'use client';
import Link from 'next/link';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
type User={id:string;displayName:string;username:string;email:string;role:'SUPPORTER'|'COLLECTOR'|'REVIEWER'|'EDITOR'|'ADMIN'};
export function AccountMenu(){
  const api=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000/api/v1';const [user,setUser]=useState<User|null>(null);const [open,setOpen]=useState(false);
  const load=useCallback(()=>{fetch(`${api}/auth/me`,{credentials:'include'}).then(r=>r.json()).then(data=>setUser(data.user??null)).catch(()=>setUser(null))},[api]);
  useEffect(()=>{load();window.addEventListener('technsports-auth-change',load);return()=>window.removeEventListener('technsports-auth-change',load)},[load]);
  const signout=async()=>{await fetch(`${api}/auth/signout`,{method:'POST',credentials:'include'});setUser(null);setOpen(false);window.dispatchEvent(new Event('technsports-auth-change'))};
  if(!user)return <div className="auth-links"><Link href="/signin">Sign in</Link><Link href="/signup">Create account</Link></div>;
  const collector=['COLLECTOR','REVIEWER','EDITOR','ADMIN'].includes(user.role);
  return <div className="account-menu"><button onClick={()=>setOpen(!open)} aria-expanded={open}><UserRound/><span>@{user.username}<small>{user.role}</small></span><ChevronDown/></button>{open&&<div><Link href="/account" onClick={()=>setOpen(false)}>Account</Link>{collector&&<Link href="/contribute" onClick={()=>setOpen(false)}>Contributor workbench</Link>}{collector&&<Link href="/contribute/transfers" onClick={()=>setOpen(false)}>Submit transfer report</Link>}{['REVIEWER','EDITOR','ADMIN'].includes(user.role)&&<Link href="/review" onClick={()=>setOpen(false)}>Review queue</Link>}{['EDITOR','ADMIN'].includes(user.role)&&<Link href="/admin/articles/new" onClick={()=>setOpen(false)}>Write article</Link>}{user.role==='ADMIN'&&<><Link href="/admin" onClick={()=>setOpen(false)}>Data administration</Link><Link href="/admin/tickets" onClick={()=>setOpen(false)}>Ticketing operations</Link><Link href="/admin/users" onClick={()=>setOpen(false)}>User roles</Link></>}<button onClick={signout}><LogOut/> Sign out</button></div>}</div>
}
