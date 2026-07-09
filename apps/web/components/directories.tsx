'use client';

import Link from 'next/link';
import { ArrowRight, CalendarDays, CheckCircle2, MapPin, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, TeamBadge } from './ui';
import { formatDate, initials, useApi } from '@/lib/api';

type Competition={id:string;name:string;seasons:Array<{id:string;label:string}>};
type Team={id:string;name:string;shortName:string;slug:string;crestUrl?:string;primaryColor?:string};
type Match={id:string;kickoffAt:string;status:string;homeScore:number;awayScore:number;round?:string;homeTeam:Team;awayTeam:Team;venue?:{name:string};venueName?:string;season:{id:string;label:string;competition:{name:string}}};
type Standing={position:number;team:Team;played:number;wins:number;draws:number;losses:number;goalDifference:number;points:number;form:string[]};
type Player={id:string;slug:string;name:string;photoUrl?:string;position:string;team:Team|null;appearances:number;goals:number;assists:number};
type Transfer={id:string;type:string;announcedAt:string;feeMinor?:string;feeCurrency?:string;feeDisclosed:boolean;player:{legalName:string;knownAs?:string;photoUrl?:string;position:string};fromTeam?:Team;toTeam?:Team};
type Article={slug:string;title:string;excerpt:string;category:string;authorName:string;coverImageUrl?:string;publishedAt:string};

export function DirectoryHeader({eyebrow,title,description}:{eyebrow:string;title:string;description:string}){return <div className="directory-head"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>}
const Loading=()=> <div className="empty-state"><b>Loading verified data…</b></div>;
const ErrorState=({text}:{text:string})=><div className="empty-state"><b>Data unavailable</b><span>{text}</span></div>;

export function ScoresDirectory(){
  const [day,setDay]=useState(0);
  const date=new Date(Date.now()+day*86400000).toISOString().slice(0,10);
  const {data,error,loading}=useApi<Match[]>(`/public/matches?date=${date}`);
  return <main className="page-shell"><DirectoryHeader eyebrow="MATCH CENTRE" title="Scores" description="Live and completed matches from the database."/><div className="filter-tabs">{([['Yesterday',-1],['Today',0],['Tomorrow',1]] as const).map(([label,value])=><button className={day===value?'on':''} onClick={()=>setDay(value)} key={label}>{label}</button>)}</div>{loading?<Loading/>:error?<ErrorState text={error}/>:<MatchList matches={data??[]}/>}</main>;
}

export function FixturesDirectory(){
  const {data:competitions}=useApi<Competition[]>('/public/competitions');
  const [seasonId,setSeasonId]=useState('');
  const selected=seasonId||competitions?.[0]?.seasons?.[0]?.id||'';
  const {data,error,loading}=useApi<Match[]>(selected?`/public/matches?seasonId=${selected}`:null);
  return <main className="page-shell"><DirectoryHeader eyebrow="MATCH CALENDAR" title="Fixtures & results" description="Browse database fixtures by competition and season."/><SeasonFilter competitions={competitions??[]} value={selected} onChange={setSeasonId}/>{loading?<Loading/>:error?<ErrorState text={error}/>:<MatchList matches={(data??[]).slice().reverse()}/>}</main>;
}

export function TableDirectory(){
  const {data:competitions}=useApi<Competition[]>('/public/competitions');
  const [seasonId,setSeasonId]=useState('');
  const selected=seasonId||competitions?.[0]?.seasons?.[0]?.id||'';
  const {data,error,loading}=useApi<Standing[]>(selected?`/public/standings/${selected}`:null);
  return <main className="page-shell"><DirectoryHeader eyebrow="STANDINGS" title="League table" description="Calculated from finished fixtures in the selected season."/><SeasonFilter competitions={competitions??[]} value={selected} onChange={setSeasonId}/>{loading?<Loading/>:error?<ErrorState text={error}/>:<Card className="full-table"><div className="full-table-row head"><span>POS</span><span>CLUB</span><span>P</span><span>W</span><span>D</span><span>L</span><span>GD</span><span>PTS</span><span>FORM</span></div>{(data??[]).map(row=><Link href={`/clubs/${row.team.slug}`} className="full-table-row" key={row.team.id}><span>{row.position}</span><span><TeamBadge small short={row.team.shortName} color={row.team.primaryColor}/><b>{row.team.name}</b></span><span>{row.played}</span><span>{row.wins}</span><span>{row.draws}</span><span>{row.losses}</span><span>{row.goalDifference>0?`+${row.goalDifference}`:row.goalDifference}</span><strong>{row.points}</strong><span className="form">{row.form.map((value,index)=><i className={value.toLowerCase()} key={index}>{value}</i>)}</span></Link>)}</Card>}</main>;
}

export function PlayersDirectory(){
  const {data,error,loading}=useApi<Player[]>('/public/players');
  const [query,setQuery]=useState('');
  const [position,setPosition]=useState('All positions');
  const positions=[...new Set((data??[]).map(player=>player.position))];
  const visible=useMemo(()=>(data??[]).filter(player=>(position==='All positions'||player.position===position)&&`${player.name} ${player.team?.name??''}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>b.goals-a.goals),[data,query,position]);
  return <main className="page-shell"><DirectoryHeader eyebrow="PLAYER INDEX" title="Player statistics" description="Verified player records calculated from collected match data."/><div className="directory-tools"><label className="search-input"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search player or club"/></label><select value={position} onChange={e=>setPosition(e.target.value)}><option>All positions</option>{positions.map(value=><option key={value}>{value}</option>)}</select></div>{loading?<Loading/>:error?<ErrorState text={error}/>:<Card className="players-table"><div className="player-row player-head"><span>RANK</span><span>PLAYER</span><span>APPS</span><span>GOALS</span><span>ASSISTS</span><span>CLUB</span></div>{visible.map((player,index)=><Link href={`/players/${player.slug}`} className="player-row" key={player.id}><span>{index+1}</span><span>{player.photoUrl?<img className="player-face-thumb" src={player.photoUrl} alt={`${player.name} face`}/>:<i>{initials(player.name)}</i>}<span><b>{player.name}</b><small>{player.position}</small></span></span><span>{player.appearances}</span><strong>{player.goals}</strong><span>{player.assists}</span><em>{player.team?.shortName??'—'}</em></Link>)}</Card>}</main>;
}

export function TransfersDirectory(){
  const {data,error,loading}=useApi<Transfer[]>('/public/transfers');
  const [type,setType]=useState('All');
  const visible=(data??[]).filter(move=>type==='All'||move.type===type);
  return <main className="page-shell"><DirectoryHeader eyebrow="PLAYER MOVEMENT" title="Transfer centre" description="Verified transfer records stored in the database."/><Link className="contribution-cta" href="/contribute/transfers">Report a transfer <ArrowRight/></Link><div className="filter-tabs">{['All','PERMANENT','LOAN','FREE_AGENT'].map(value=><button className={type===value?'on':''} onClick={()=>setType(value)} key={value}>{value.replace('_',' ')}</button>)}</div>{loading?<Loading/>:error?<ErrorState text={error}/>:<div className="transfer-directory">{visible.map(move=><div key={move.id}><time>{formatDate(move.announcedAt)}</time><span>{move.player.photoUrl?<img className="player-face-thumb" src={move.player.photoUrl} alt={`${move.player.knownAs??move.player.legalName} face`}/>:<i>{initials(move.player.knownAs??move.player.legalName)}</i>}<b>{move.player.knownAs??move.player.legalName}<small>{move.player.position}</small></b></span><span>{move.fromTeam?.name??'Unattached'} <ArrowRight/> <b>{move.toTeam?.name??'Unattached'}</b></span><strong>{move.feeDisclosed&&move.feeMinor?`${move.feeCurrency} ${move.feeMinor}`:'Undisclosed'}<small>{move.type.replace('_',' ')}</small></strong><em><CheckCircle2/> Confirmed</em></div>)}</div>}</main>;
}

export function NewsDirectory(){
  const {data,error,loading}=useApi<Article[]>('/public/articles');
  const [topic,setTopic]=useState('All');
  const topics=['All',...new Set((data??[]).map(article=>article.category))];
  const visible=(data??[]).filter(article=>topic==='All'||article.category===topic);
  return <main className="page-shell"><DirectoryHeader eyebrow="THE NOTEBOOK" title="News & analysis" description="Published stories from the editorial database."/><div className="filter-tabs">{topics.map(value=><button className={topic===value?'on':''} onClick={()=>setTopic(value)} key={value}>{value}</button>)}</div>{loading?<Loading/>:error?<ErrorState text={error}/>:<div className="news-directory">{visible.map(article=><Link href={`/news/${article.slug}`} key={article.slug}><div className="story-art" style={article.coverImageUrl?{backgroundImage:`url(${article.coverImageUrl})`}:undefined}/><div><span>{article.category}</span><h2>{article.title}</h2><p>{article.excerpt}</p><small>{formatDate(article.publishedAt)} · {article.authorName}</small></div></Link>)}</div>}</main>;
}

function MatchList({matches}:{matches:Match[]}){
  if(!matches.length)return <div className="empty-state"><CalendarDays/><b>No fixtures found</b><span>Data will appear after a fixture is added.</span></div>;
  return <div className="directory-fixtures">{matches.map(match=><Link href={`/matches/${match.id}`} key={match.id}><span className={match.status==='LIVE'?'live-label':''}>{match.status}</span><b>{match.homeTeam.name}</b><strong>{match.status==='SCHEDULED'?'–':match.homeScore} — {match.status==='SCHEDULED'?'–':match.awayScore}</strong><b>{match.awayTeam.name}</b><small><MapPin/>{match.venue?.name??match.venueName??formatDate(match.kickoffAt)}</small></Link>)}</div>;
}

function SeasonFilter({competitions,value,onChange}:{competitions:Competition[];value:string;onChange:(value:string)=>void}){
  return <div className="directory-tools"><label><small>SEASON</small><select value={value} onChange={e=>onChange(e.target.value)}><option value="" disabled>Select season</option>{competitions.flatMap(competition=>competition.seasons.map(season=><option value={season.id} key={season.id}>{competition.name} · {season.label}</option>))}</select></label></div>;
}
