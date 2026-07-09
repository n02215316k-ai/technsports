'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Calendar, Flag, Footprints } from 'lucide-react';
import { useParams } from 'next/navigation';
import { Card, TeamBadge } from '@/components/ui';
import { formatDate, initials, useApi } from '@/lib/api';

export default function PlayerProfile(){
  const {slug}=useParams<{slug:string}>();
  const {data:player,error,loading}=useApi<any>(`/public/players/${slug}`);
  const {data:list}=useApi<any[]>('/public/players');
  if(loading)return <main className="page-shell">Loading player…</main>;
  if(error||!player)return <main className="page-shell"><div className="admin-error">{error||'Player not found'}</div></main>;
  const stats=list?.find(item=>item.slug===slug);
  const current=player.registrations[0]?.team;
  const name=player.knownAs??player.legalName;
  return <main className="page-shell">
    <Link href="/players" className="back"><ArrowLeft/> Back to players</Link>
    <section className="profile-hero player-profile">
      <div className="player-avatar">{player.photoUrl?<img src={player.photoUrl} alt={`${name} face`}/>:initials(name)}</div>
      <div className="player-identity"><span>{player.position}</span><h1>{name}</h1><p><Flag/> {player.nationalityCode} · <Calendar/> {player.dateOfBirth?formatDate(player.dateOfBirth):'Birth date not recorded'} · <Footprints/> {player.preferredFoot??'Foot not recorded'}</p>{current&&<div><TeamBadge small short={current.shortName} color={current.primaryColor}/><b>{current.name}</b><small>Current registration</small></div>}</div>
    </section>
    <nav className="profile-tabs"><a href="#statistics">Statistics</a><a href="#career">Career</a><a href="#transfers">Transfers</a><a href="#news">News</a></nav>
    <section id="statistics" className="anchor-section"><div className="records-heading"><div><span className="eyebrow">VERIFIED EVENTS</span><h2>Performance statistics</h2></div></div><div className="player-kpis"><Card><span>APPEARANCES</span><strong>{stats?.appearances??0}</strong></Card><Card><span>GOALS</span><strong>{stats?.goals??0}</strong></Card><Card><span>ASSISTS</span><strong>{stats?.assists??0}</strong></Card><Card><span>CARDS</span><strong>{stats?.cards??0}</strong></Card></div></section>
    <section id="career" className="anchor-section"><div className="records-heading"><div><span className="eyebrow">REGISTRATION HISTORY</span><h2>Clubs</h2></div></div><Card className="career-table">{player.registrations.map((registration:any)=><div className="career-row" key={registration.id}><span><TeamBadge small short={registration.team.shortName} color={registration.team.primaryColor}/><b>{registration.team.name}</b></span><span>{formatDate(registration.startsAt)} — {registration.endsAt?formatDate(registration.endsAt):'Present'}</span><span>#{registration.shirtNumber??'—'}</span></div>)}</Card></section>
    <section id="transfers" className="anchor-section"><div className="records-heading"><div><span className="eyebrow">TRANSFER HISTORY</span><h2>Career moves</h2></div></div><div className="transfer-history">{player.transfers.map((move:any)=><div key={move.id}><time>{formatDate(move.announcedAt)}</time><span>{move.fromTeam?.name??'Unattached'}</span><ArrowRight/><span>{move.toTeam?.name??'Unattached'}</span><b>{move.feeDisclosed&&move.feeMinor?`${move.feeCurrency} ${move.feeMinor}`:'Undisclosed'}</b></div>)}</div></section>
    <section id="news" className="anchor-section"><div className="records-heading"><div><span className="eyebrow">RELATED ARTICLES</span><h2>News</h2></div></div><div className="related-list">{player.articles.filter((link:any)=>link.article.status==='PUBLISHED').map((link:any)=><Link href={`/news/${link.article.slug}`} key={link.article.id}><article><span>{link.article.category}</span><h3>{link.article.title}</h3></article></Link>)}</div></section>
  </main>;
}
