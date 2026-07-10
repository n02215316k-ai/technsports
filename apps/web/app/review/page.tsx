'use client';

import Link from 'next/link';
import { CheckCircle2, ExternalLink, ShieldCheck, UserCheck, XCircle } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';

type Observation={id:string;eventType:string;status:string;matchSecond:number;subjectId?:string;player?:{legalName:string;knownAs?:string};contributor?:{username?:string;displayName:string};match:{id:string;homeTeam:{name:string};awayTeam:{name:string}};identityClaim?:{id:string;suppliedName:string}};
type TransferClaim={id:string;playerId:string;fromTeamId?:string;toTeamId:string;type:string;status:string;sourceUrl:string;feeMinor?:string};
type IdentityClaim={id:string;suppliedName:string;status:string;createdAt:string;team:{name:string};season:{label:string};observations:{id:string;eventType:string;contributor?:{username?:string;displayName:string};match:{homeTeam:{name:string};awayTeam:{name:string}}}[]};
type ReviewArticle={id:string;slug:string;title:string;excerpt:string;body?:{text?:string};status:string;authorName:string;createdAt:string;match?:{homeTeam:{name:string};awayTeam:{name:string}};authorUser?:{username?:string;displayName:string;role:string};_count:{comments:number;reactions:number}};
type Queue={observations:Observation[];transfers:TransferClaim[];identityClaims:IdentityClaim[];articles:ReviewArticle[];settings?:{contributorArticleAutoApprove:boolean}};

export default function Review(){
  const api=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000/api/v1';
  const [user,setUser]=useState<any>();
  const [queue,setQueue]=useState<Queue>({observations:[],transfers:[],identityClaims:[],articles:[]});
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');

  const load=useCallback(async()=>{
    setError('');
    try{
      const me=await fetch(`${api}/auth/me`,{credentials:'include'}).then(r=>r.json());
      setUser(me.user??null);
      const response=await fetch(`${api}/admin/review`,{credentials:'include'});
      const data=await response.json().catch(()=>({observations:[],transfers:[],identityClaims:[],articles:[]}));
      if(!response.ok)throw new Error(data.message||'Reviewer access required');
      setQueue(data);
    }catch(e){setError(e instanceof Error?e.message:'Could not load review queue')}
  },[api]);
  useEffect(()=>{load()},[load]);

  const act=async(path:string,body?:unknown)=>{
    setError('');setNotice('');
    const response=await fetch(`${api}${path}`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):'{}'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(Array.isArray(data.message)?data.message.join(', '):data.message||'Action failed');
    setNotice('Review action saved');await load();
  };

  if(user&&!['REVIEWER','EDITOR','ADMIN'].includes(user.role))return <main className="page-shell auth-required"><ShieldCheck/><h1>Reviewer access required</h1><Link href="/account">Return to account</Link></main>;
  return <main className="page-shell">
    <div className="directory-head"><span className="eyebrow">DATA REVIEW</span><h1>Review queue</h1><p>Approve consensus data, resolve disputed events, reject bad submissions, and map unlisted player claims to canonical player records.</p></div>
    {notice&&<div className="admin-notice"><CheckCircle2/>{notice}</div>}{error&&<div className="admin-error">{error}</div>}

    <section className="review-panel"><header><span className="eyebrow">CONTRIBUTOR ARTICLES</span><h2>Match analysis moderation</h2></header><div className="review-setting"><span><b>Auto-approve contributor match analysis</b><small>{queue.settings?.contributorArticleAutoApprove?'New eligible contributor posts publish immediately.':'New contributor posts wait for manual approval.'}</small></span><button className={queue.settings?.contributorArticleAutoApprove?'danger':''} onClick={()=>act('/admin/review/articles/auto-approve',{enabled:!queue.settings?.contributorArticleAutoApprove})}>{queue.settings?.contributorArticleAutoApprove?'Disable':'Enable'}</button></div><div className="review-list review-list-actions article-review-list">{queue.articles.map(item=><article key={item.id}><span>{item.status}</span><b>{item.title}</b><p>{item.excerpt}<small>{item.match?`${item.match.homeTeam.name} v ${item.match.awayTeam.name}`:'Match not linked'} · @{item.authorUser?.username||item.authorName} · {item._count.comments} comments</small><details><summary>Read submission</summary>{item.body?.text}</details></p>{item.status==='PUBLISHED'?<Link href={`/news/${item.slug}`} target="_blank"><ExternalLink/> View</Link>:<span>Pending</span>}<button onClick={()=>act(`/admin/review/articles/${item.id}/approve`)}><CheckCircle2/>Approve</button><button className="danger" onClick={()=>act(`/admin/review/articles/${item.id}/reject`,{reason:'Needs editorial revision'})}><XCircle/>Reject</button><button className="danger" onClick={()=>act(`/admin/review/articles/${item.id}/delete`,{reason:'Deleted by moderator'})}><XCircle/>Delete</button></article>)}{!queue.articles.length&&<Empty label="No contributor articles need review."/>}</div></section>

    <section className="review-panel"><header><span className="eyebrow">MATCH EVENTS</span><h2>Pending and conflicted observations</h2></header><div className="review-list review-list-actions">{queue.observations.map(item=><article key={item.id}><span>{item.status}</span><b>{item.eventType}</b><p>{item.match.homeTeam.name} v {item.match.awayTeam.name}<small>{item.player?.knownAs||item.player?.legalName||item.identityClaim?.suppliedName||item.subjectId||'Team event'} · {item.matchSecond}s · @{item.contributor?.username||'collector'}</small></p><button onClick={()=>act(`/admin/review/observations/${item.id}/approve`)}><CheckCircle2/>Approve</button><button className="danger" onClick={()=>act(`/admin/review/observations/${item.id}/reject`)}><XCircle/>Reject</button></article>)}{!queue.observations.length&&<Empty label="No observations need review."/>}</div></section>

    <section className="review-panel"><header><span className="eyebrow">TRANSFERS</span><h2>Contributor transfer claims</h2></header><div className="review-list review-list-actions">{queue.transfers.map(item=><article key={item.id}><span>{item.status}</span><b>{item.type}</b><p>{item.fromTeamId||'Unattached'} → {item.toTeamId}<small>{item.playerId} · {item.feeMinor?`fee ${item.feeMinor}`:'undisclosed/free'}</small></p><a href={item.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink/> Source</a><button onClick={()=>act(`/admin/review/transfers/${item.id}/approve`)}><CheckCircle2/>Approve</button><button className="danger" onClick={()=>act(`/admin/review/transfers/${item.id}/reject`)}><XCircle/>Reject</button></article>)}{!queue.transfers.length&&<Empty label="No transfer claims need review."/>}</div></section>

    <section className="review-panel"><header><span className="eyebrow">PLAYER IDENTITY</span><h2>Unlisted player claims</h2></header><div className="identity-claims">{queue.identityClaims.map(claim=><IdentityCard key={claim.id} claim={claim} onResolve={(playerId)=>act(`/admin/review/identity-claims/${claim.id}/resolve`,{playerId})} onReject={()=>act(`/admin/review/identity-claims/${claim.id}/reject`)}/>) }{!queue.identityClaims.length&&<Empty label="No identity claims need review."/>}</div></section>
  </main>
}

function IdentityCard({claim,onResolve,onReject}:{claim:IdentityClaim;onResolve:(playerId:string)=>void;onReject:()=>void}){
  const [playerId,setPlayerId]=useState('');
  const submit=(e:FormEvent)=>{e.preventDefault();if(playerId.trim())onResolve(playerId.trim())};
  return <article className="identity-card"><header><UserCheck/><div><b>{claim.suppliedName}</b><span>{claim.team.name} · {claim.season.label}</span></div></header><ul>{claim.observations.map(item=><li key={item.id}>{item.eventType} · {item.match.homeTeam.name} v {item.match.awayTeam.name} · @{item.contributor?.username||'collector'}</li>)}</ul><form onSubmit={submit}><input value={playerId} onChange={e=>setPlayerId(e.target.value)} placeholder="Canonical player ID"/><button><CheckCircle2/>Resolve</button><button type="button" className="danger" onClick={onReject}><XCircle/>Reject</button></form></article>
}

function Empty({label}:{label:string}){return <div className="review-empty">{label}</div>}
