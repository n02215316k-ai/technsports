'use client';

import Link from 'next/link';
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, MapPinned, Radio, ShieldCheck, UserCheck, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { API_URL, formatDate } from '@/lib/api';

type User={id:string;displayName:string;username:string;role:'SUPPORTER'|'COLLECTOR'|'REVIEWER'|'EDITOR'|'ADMIN'};
type Team={name:string;shortName:string};
type Match={id:string;status:string;kickoffAt:string;round?:string;venue?:{name:string};venueName?:string;homeTeam:Team;awayTeam:Team;season:{label:string;competition:{name:string}};assignments?:{scope:string;user:{username:string;displayName:string}}[]};
type Assignment={id:string;scope:string;acceptedAt?:string;completedAt?:string;observations:number;match:Match};
type Competition={seasons:{id:string;label:string;competitionId:string}[];name:string};

const collectorRoles=['COLLECTOR','REVIEWER','EDITOR','ADMIN'];
const scopeLabels:Record<string,string>={LINEUPS:'Lineups',TIMELINE:'Timeline events',PLAYER_ACTIONS:'Player actions',TEAM_STATS:'Team totals',MEDIA:'Media notes'};

export default function Contribute(){
  const [user,setUser]=useState<User|null|undefined>(undefined);
  const [assignments,setAssignments]=useState<Assignment[]>([]);
  const [matches,setMatches]=useState<Match[]>([]);
  const [competitions,setCompetitions]=useState<Competition[]>([]);
  const [seasonId,setSeasonId]=useState('');
  const [error,setError]=useState('');
  const seasons=useMemo(()=>competitions.flatMap(c=>c.seasons.map(s=>({...s,competitionName:c.name}))),[competitions]);
  const selectedSeason=seasonId||seasons[0]?.id||'';
  const authorised=Boolean(user&&collectorRoles.includes(user.role));

  useEffect(()=>{fetch(`${API_URL}/auth/me`,{credentials:'include'}).then(r=>r.json()).then(data=>setUser(data.user??null)).catch(()=>setUser(null))},[]);
  useEffect(()=>{fetch(`${API_URL}/public/competitions`,{credentials:'include'}).then(r=>r.json()).then(setCompetitions).catch(()=>setCompetitions([]))},[]);
  useEffect(()=>{
    if(!authorised)return;
    setError('');
    Promise.all([
      fetch(`${API_URL}/contributor/assignments`,{credentials:'include'}),
      fetch(`${API_URL}/contributor/matches${selectedSeason?`?seasonId=${selectedSeason}`:''}`,{credentials:'include'})
    ]).then(async([a,m])=>{
      if(!a.ok||!m.ok)throw new Error('Contributor workspace is unavailable for this account');
      setAssignments(await a.json());setMatches(await m.json());
    }).catch(reason=>setError(reason.message));
  },[authorised,selectedSeason]);

  return <main>
    <section className="contrib-hero"><div><span className="kicker"><span/> THE DATA NETWORK</span><h1>Your football knowledge<br/>becomes trusted data.</h1><p>Collect assigned fixtures, submit live or offline observations, and help build a verified Zimbabwe football database.</p>{user?<Link href="/account" className="primary">Open account <ArrowRight/></Link>:<Link href="/signup" className="primary">Create contributor account <ArrowRight/></Link>}</div></section>

    <section className="page-shell contributor-workbench">
      <div className="step-grid"><div><i>01</i><MapPinned/><h3>Choose your coverage</h3><p>Admins assign exact matches and scopes so collectors know what data they own.</p></div><div><i>02</i><ClipboardList/><h3>Collect the match</h3><p>Open the live console from a fixture card and record events against canonical players.</p></div><div><i>03</i><Activity/><h3>Work offline</h3><p>Queued observations sync automatically when the connection comes back.</p></div><div><i>04</i><ShieldCheck/><h3>Earn trust</h3><p>Consensus and reviewer approval turn submissions into official statistics.</p></div></div>

      <div className="role-panel"><div><span className="eyebrow">BUILT FOR TRUST</span><h2>Several eyes. One verified record.</h2><p>Two collectors can track the same event, while specialist collectors handle lineups, timeline actions, team statistics or media notes. TechnSports compares observations before publication.</p></div><div><span><Users/> Multiple independent collectors</span><span><CheckCircle2/> Confidence scoring per fact</span><span><ShieldCheck/> Full editor audit trail</span></div></div>

      <section className="workspace-panel">
        <header><div><span className="eyebrow">CONTRIBUTOR WORKBENCH</span><h2>Data collection tools</h2></div>{user&&<div className="collector-identity compact"><UserCheck/><span><small>SIGNED IN AS</small><b>@{user.username}</b><em>{user.role}</em></span></div>}</header>
        {user===undefined&&<div className="empty-state">Loading account…</div>}
        {!user&&<div className="collector-access"><AlertTriangle/><span><b>Sign in required</b>Use your unique collector username so every contribution is traceable.</span><Link href="/signin">Sign in</Link></div>}
        {user&&!authorised&&<div className="collector-access"><AlertTriangle/><span><b>Collector role required</b>Your account is currently {user.role}. Ask an admin to assign Collector access.</span><Link href="/account">Account</Link></div>}
        {error&&<div className="admin-error">{error}</div>}

        {authorised&&<>
          <div className="workspace-actions"><Link href="/contribute/transfers">Report transfer <ArrowRight/></Link>{user&&['REVIEWER','EDITOR','ADMIN'].includes(user.role)&&<Link href="/review">Review queue <ArrowRight/></Link>}{user&&['EDITOR','ADMIN'].includes(user.role)&&<Link href="/admin/articles/new">Write article <ArrowRight/></Link>}{user?.role==='ADMIN'&&<Link href="/admin">Admin console <ArrowRight/></Link>}</div>
          <div className="records-heading"><div><span className="eyebrow">ASSIGNED MATCHES</span><h2>Your match work</h2></div></div>
          <div className="assignment-list">{assignments.length?assignments.map(item=><MatchWorkCard key={item.id} match={item.match} scope={item.scope} observations={item.observations}/>):<div className="empty-state"><Radio/><b>No assigned matches yet</b><span>You can still open available fixtures below if your role allows collection.</span></div>}</div>

          <div className="records-heading"><div><span className="eyebrow">AVAILABLE FIXTURES</span><h2>Open collection console</h2></div><select value={selectedSeason} onChange={e=>setSeasonId(e.target.value)}><option value="">Latest season</option>{seasons.map(season=><option value={season.id} key={season.id}>{season.competitionName} · {season.label}</option>)}</select></div>
          <div className="available-matches">{matches.length?matches.map(match=><MatchWorkCard key={match.id} match={match} scope={match.assignments?.length?`${match.assignments.length} assigned collector${match.assignments.length===1?'':'s'}`:'Open fixture'}/>):<div className="empty-state">No available fixtures for this season.</div>}</div>
        </>}
      </section>
    </section>
  </main>;
}

function MatchWorkCard({match,scope,observations}:{match:Match;scope:string;observations?:number}){
  return <Link href={`/collect/matches/${match.id}`} className="match-work-card">
    <span>{match.status}</span>
    <b>{match.homeTeam.name} <i>v</i> {match.awayTeam.name}</b>
    <small>{match.season.competition.name} · {match.round??match.season.label} · {formatDate(match.kickoffAt)}</small>
    <em>{scopeLabels[scope]??scope}</em>
    {typeof observations==='number'&&<small>{observations} submitted observation{observations===1?'':'s'}</small>}
    <strong>Collect data <ArrowRight/></strong>
  </Link>;
}
