'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, Send } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { API_URL, formatDate } from '@/lib/api';

type Match={id:string;kickoffAt:string;round?:string;homeTeam:{name:string};awayTeam:{name:string};season:{label:string;competition:{name:string}};_count?:{observations:number;articles:number}};

export default function ContributorArticlePage(){
  const [matches,setMatches]=useState<Match[]>([]);
  const [matchId,setMatchId]=useState('');
  const [title,setTitle]=useState('');
  const [excerpt,setExcerpt]=useState('');
  const [body,setBody]=useState('');
  const [coverImageUrl,setCoverImageUrl]=useState('');
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const selected=useMemo(()=>matches.find(match=>match.id===matchId),[matches,matchId]);
  const words=body.trim()?body.trim().split(/\s+/).length:0;
  useEffect(()=>{fetch(`${API_URL}/contributor/article-matches`,{credentials:'include'}).then(async response=>{if(!response.ok)throw new Error((await response.json().catch(()=>null))?.message||'Could not load eligible matches');return response.json()}).then(data=>{setMatches(data);if(data[0])setMatchId(data[0].id)}).catch(reason=>setError(reason.message))},[]);
  const submit=async(e:FormEvent)=>{e.preventDefault();setSaving(true);setError('');setNotice('');try{const response=await fetch(`${API_URL}/contributor/articles`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({matchId,title,excerpt,body,coverImageUrl:coverImageUrl||undefined})});const data=await response.json();if(!response.ok)throw new Error(Array.isArray(data.message)?data.message.join(', '):data.message||'Could not submit analysis');setNotice(data.status==='PUBLISHED'?`Published: /news/${data.slug}`:'Submitted for editorial review. It will appear after approval.')}catch(reason){setError(reason instanceof Error?reason.message:'Could not submit analysis')}finally{setSaving(false)}};
  return <main className="page-shell editor-shell contributor-article-shell"><Link href="/contribute" className="back"><ArrowLeft/> Contributor workbench</Link><div className="directory-head"><span className="eyebrow">CONTRIBUTOR ANALYSIS</span><h1>Write match analysis</h1><p>Contributors can publish analysis only for matches they were assigned to or contributed data to.</p></div>{notice&&<div className="admin-notice"><FileText/>{notice}</div>}{error&&<div className="admin-error">{error}</div>}{!matches.length&&!error?<div className="empty-state"><FileText/><b>No eligible matches yet</b><span>Collect data on a fixture first, then return here to write your analysis.</span></div>:<form className="article-editor" onSubmit={submit}><section className="editor-fields"><label>Match<select required value={matchId} onChange={e=>setMatchId(e.target.value)}>{matches.map(match=><option value={match.id} key={match.id}>{match.homeTeam.name} v {match.awayTeam.name} · {formatDate(match.kickoffAt)}</option>)}</select><small>{selected?`${selected.season.competition.name} · ${selected.round??selected.season.label} · ${selected._count?.observations??0} of your observations`:''}</small></label><label>Headline<input required minLength={5} maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Why Dynamos controlled the second half"/></label><label>Excerpt<textarea required minLength={20} maxLength={400} rows={3} value={excerpt} onChange={e=>setExcerpt(e.target.value)} placeholder="Short summary for the news card."/></label><label>Analysis body<textarea required minLength={50} rows={16} value={body} onChange={e=>setBody(e.target.value)} placeholder="Use your collected data, key moments and tactical notes. Separate paragraphs with blank lines."/>{words} words</label><label>Cover image URL <span>(optional)</span><input type="url" value={coverImageUrl} onChange={e=>setCoverImageUrl(e.target.value)} placeholder="https://..."/></label><button className="editor-submit" disabled={saving}><Send/>{saving?'Submitting…':'Submit match analysis'}</button></section><aside className="article-preview"><header>LIVE PREVIEW</header><div className="preview-cover placeholder">{selected?`${selected.homeTeam.name} v ${selected.awayTeam.name}`:'MATCH ANALYSIS'}</div><div><span>MATCH ANALYSIS</span><h2>{title||'Your headline will appear here'}</h2><p className="preview-excerpt">{excerpt||'Your summary will appear here.'}</p><small>Contributor article · {words} words</small><article>{body?body.split(/\n\n+/).slice(0,5).map((paragraph,index)=><p key={index}>{paragraph}</p>):<p>Write your first paragraph to preview the article.</p>}</article></div></aside></form>}</main>;
}
