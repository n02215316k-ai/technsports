'use client';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
type User={id:string;displayName:string;username:string;email:string;role:string;createdAt:string};
export default function UserRoles(){
  const api=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000/api/v1';const [key,setKey]=useState('');const [users,setUsers]=useState<User[]>([]);const [error,setError]=useState('');
  const headers=useCallback(():Record<string,string>=>(key?{'x-admin-key':key}:{}),[key]);
  const load=useCallback(()=>fetch(`${api}/admin/users`,{credentials:'include',headers:headers()}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.message);setUsers(data)}).catch(reason=>setError(reason.message)),[api,headers]);
  useEffect(()=>{load()},[load]);
  const assign=async(id:string,role:string)=>{setError('');const response=await fetch(`${api}/admin/users/${id}/role`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json',...headers()},body:JSON.stringify({role})});if(!response.ok){const data=await response.json();setError(data.message);return}load()};
  return <main className="page-shell admin-shell"><Link href="/admin" className="back"><ArrowLeft/> Data administration</Link><div className="directory-head"><span className="eyebrow">ACCESS CONTROL</span><h1>User roles</h1><p>Assign privileged roles only after identity and operational checks.</p></div><div className="admin-warning"><ShieldCheck/><span><b>Authenticated administration</b>Sign in as an administrator. An operational API key may be supplied only when configured by deployment.</span><label>Optional admin API key<input type="password" value={key} onChange={e=>setKey(e.target.value)}/></label></div>{error&&<div className="admin-error">{error}</div>}<div className="user-role-table"><div className="user-role-row head"><span>USER</span><span>EMAIL</span><span>JOINED</span><span>ROLE</span></div>{users.map(user=><div className="user-role-row" key={user.id}><b>{user.displayName}<small>@{user.username}</small></b><span>{user.email}</span><time>{new Date(user.createdAt).toLocaleDateString('en-ZW')}</time><select value={user.role} onChange={e=>assign(user.id,e.target.value)}><option>SUPPORTER</option><option>COLLECTOR</option><option>REVIEWER</option><option>EDITOR</option><option>ADMIN</option></select></div>)}</div></main>;
}
