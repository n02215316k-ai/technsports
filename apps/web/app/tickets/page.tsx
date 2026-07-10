'use client';

import Link from 'next/link';
import { ArrowRight, CalendarDays, MapPin, Ticket } from 'lucide-react';
import { formatDate, useApi } from '@/lib/api';

type Match={id:string;kickoffAt:string;status:string;round?:string;homeTeam:{name:string};awayTeam:{name:string};venue?:{name:string};venueName?:string;season:{label:string;competition:{name:string}}};

export default function TicketsDirectory(){
  const {data,error,loading}=useApi<Match[]>('/public/matches?limit=80');
  const upcoming=(data??[]).filter(match=>match.status!=='FINISHED').sort((a,b)=>new Date(a.kickoffAt).getTime()-new Date(b.kickoffAt).getTime());
  return <main className="page-shell ticket-shell">
    <div className="directory-head"><span className="eyebrow">MATCH TICKETS</span><h1>Buy tickets</h1><p>Choose a fixture, reserve seats or general admission, then receive QR tickets after payment confirmation.</p></div>
    {loading?<div className="empty-state">Loading fixtures…</div>:error?<div className="admin-error">{error}</div>:<section className="ticket-fixture-list">{upcoming.length?upcoming.map(match=><Link href={`/tickets/matches/${match.id}`} key={match.id}><Ticket/><span><b>{match.homeTeam.name} v {match.awayTeam.name}</b><small>{match.season.competition.name} · {match.round??match.season.label}</small></span><span><CalendarDays/> {formatDate(match.kickoffAt)}</span><span><MapPin/> {match.venue?.name??match.venueName??'Venue TBC'}</span><strong>Buy <ArrowRight/></strong></Link>):<div className="empty-state"><Ticket/><b>No upcoming fixtures</b><span>Tickets will appear once fixtures are added.</span></div>}</section>}
  </main>;
}
