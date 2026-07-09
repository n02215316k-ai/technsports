'use client';
import Link from 'next/link';
import { CheckCircle2, MailCheck } from 'lucide-react';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_URL } from '@/lib/api';
function VerifyEmailContent(){
  const params=useSearchParams();const router=useRouter();const token=params.get('token');const sent=params.get('sent');
  const [status,setStatus]=useState(token?'Verifying your email…':`Verification email sent${sent?` to ${sent}`:''}.`);const [error,setError]=useState('');
  useEffect(()=>{if(!token)return;fetch(`${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`,{credentials:'include'}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(Array.isArray(data.message)?data.message.join(', '):data.message);window.dispatchEvent(new Event('technsports-auth-change'));setStatus('Email verified. Redirecting to your account…');setTimeout(()=>router.push('/account'),900)}).catch(reason=>setError(reason.message))},[token,router]);
  const resend=async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const email=String(new FormData(e.currentTarget).get('email'));const response=await fetch(`${API_URL}/auth/resend-verification`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});if(response.ok)setStatus('If the account exists and is unverified, a new link has been sent.')};
  return <main className="page-shell auth-page"><div><span className="eyebrow">ACCOUNT SECURITY</span><h1>Verify email</h1><p>{status}</p></div>{error&&<div className="admin-error">{error}</div>}<section className="auth-form"><MailCheck/>{!token&&<form onSubmit={resend}><label>Email<input name="email" type="email" required defaultValue={sent??''}/></label><button>Resend verification</button></form>}{token&&!error&&<CheckCircle2/>}{error&&<Link href="/signup">Create a new account</Link>}</section></main>;
}
export default function VerifyEmail(){return <Suspense fallback={<main className="page-shell">Loading verification…</main>}><VerifyEmailContent/></Suspense>}
