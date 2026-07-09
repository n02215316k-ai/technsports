'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, MapPin, Radio, Send, ShieldCheck, Trophy, UserCheck, WifiOff } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { submitOrQueue } from '@/lib/offline-queue';

type Result={status:string;confidence?:number;agreeingSources?:number;observationId?:string;identityStatus?:string;playerId?:string;subjectId?:string;queued?:boolean;queueId?:string};
type Participant={id:string;name:string;teamId:'home'|'away';shirtNumber?:number;position:string;source:string};
type AuthUser={id:string;displayName:string;username:string;role:'SUPPORTER'|'COLLECTOR'|'REVIEWER'|'EDITOR'|'ADMIN'};
type Fixture={id:string;status:string;homeScore:number;awayScore:number;round?:string;venueName?:string;venue?:{name:string};homeTeam:{name:string};awayTeam:{name:string};season:{label:string;competition:{name:string}}};
const playerEvents=['GOAL','SHOT','TOUCH','FOUL','PENALTY','YELLOW_CARD','RED_CARD'];
const collectorRoles=['COLLECTOR','REVIEWER','EDITOR','ADMIN'];

export default function CollectorConsole(){
  const {id}=useParams<{id:string}>();
  const api=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000/api/v1';
  const [fixture,setFixture]=useState<Fixture|null>(null);
  const home=fixture?.homeTeam.name??'Home team';
  const away=fixture?.awayTeam.name??'Away team';
  const [user,setUser]=useState<AuthUser|null|undefined>(undefined);
  const [eventType,setEventType]=useState('GOAL');
  const [minute,setMinute]=useState(0);
  const [team,setTeam]=useState('home');
  const [playerId,setPlayerId]=useState('walter-musona');
  const [unlistedName,setUnlistedName]=useState('');
  const [participants,setParticipants]=useState<Participant[]>([]);
  const [result,setResult]=useState<Result|null>(null);
  const [error,setError]=useState('');
  const [sending,setSending]=useState(false);
  const [eventKey,setEventKey]=useState('goal-67-walter');
  const [method,setMethod]=useState('RIGHT_FOOT');
  const [distance,setDistance]=useState(18);
  const [outcome,setOutcome]=useState('ON_TARGET');
  const [side,setSide]=useState('RIGHT');
  const [fouledPlayer,setFouledPlayer]=useState('takunda-benhura');
  const [foulType,setFoulType]=useState('TACKLE');
  const [duration,setDuration]=useState(20);
  const [x,setX]=useState(50);
  const [y,setY]=useState(50);
  const [isPenalty,setIsPenalty]=useState(false);
  const [playerOn,setPlayerOn]=useState('takunda-benhura');
  const [playerOff,setPlayerOff]=useState('walter-musona');

  useEffect(()=>{
    fetch(`${api}/auth/me`,{credentials:'include'}).then(r=>r.json()).then(data=>setUser(data.user??null)).catch(()=>setUser(null));
    fetch(`${api}/public/matches/${id}`).then(r=>r.json()).then(setFixture).catch(()=>setError('Could not load the assigned fixture'));
    fetch(`${api}/matches/${id}/participants`).then(r=>r.json()).then(data=>setParticipants(data.participants??[])).catch(()=>setError('Could not load participant candidates'));
  },[api,id]);

  const teamPlayers=participants.filter(player=>player.teamId===team);
  const requiresPlayer=playerEvents.includes(eventType);
  const authorised=Boolean(user&&collectorRoles.includes(user.role));
  const payload=()=>{const base={team};switch(eventType){case'GOAL':return{...base,scoringMethod:method,distanceMeters:distance,isPenalty};case'SHOT':return{...base,scoringMethod:method,distanceMeters:distance,outcome};case'TOUCH':return{...base,x,y};case'FREE_KICK':return{...base,distanceMeters:distance,outcome};case'CORNER':return{...base,side};case'FOUL':return{...base,fouledPlayerId:fouledPlayer,foulType};case'PENALTY':return{...base,scoringMethod:'RIGHT_FOOT',outcome};case'SUBSTITUTION':return{...base,playerOnId:playerOn,playerOffId:playerOff};case'POSSESSION_INTERVAL':return{...base,durationSeconds:duration};default:return base}};
  const submit=async(e:FormEvent)=>{e.preventDefault();if(!user||!authorised){setError('Sign in with a collector account before submitting match data.');return}setSending(true);setError('');try{const identity=requiresPlayer?(playerId==='__unlisted__'?{unlistedPlayerName:unlistedName,teamId:team}:{playerId}):{};const response=await submitOrQueue(`${api}/matches/${id}/observations`,{contributorId:user.id,eventType,matchSecond:minute*60,payload:payload(),clientEventId:`${user.id}-${id}-${eventKey}`,...identity});setResult(response as Result)}catch(reason){setError(reason instanceof Error?reason.message:'Submission failed')}finally{setSending(false)}};
  const playerOptions=(value:string,setter:(value:string)=>void,label:string)=><label>{label}<select value={value} onChange={e=>setter(e.target.value)}>{teamPlayers.map(player=><option key={player.id} value={player.id}>{player.name}</option>)}</select></label>;

  return <main className="page-shell collector-shell">
    <Link className="back" href={`/matches/${id}`}><ArrowLeft/> Back to match centre</Link>

    <section className="collector-match-context" aria-label="Match being collected">
      <header><span><Radio/> {fixture?.status==='LIVE'?'LIVE COLLECTION':'MATCH COLLECTION'}</span><b>{fixture?.season.competition.name??'Competition'} · {fixture?.season.label??'Season'}</b><small>Match ref: {id}</small></header>
      <div className="collector-scoreline">
        <div><small>HOME</small><strong>{home}</strong></div>
        <div className="collector-score"><span>{fixture?.homeScore??'–'}</span><i>:</i><span>{fixture?.awayScore??'–'}</span><small>{fixture?.status??'Loading'}</small></div>
        <div><small>AWAY</small><strong>{away}</strong></div>
      </div>
      <footer><span><Trophy/> {fixture?.round??'Round not set'}</span><span><MapPin/> {fixture?.venue?.name??fixture?.venueName??'Venue to be confirmed'}</span><span><Clock3/> Collection clock: {minute}&apos;</span></footer>
    </section>

    <div className="collector-title"><div><span className="eyebrow">LIVE EVENT CAPTURE</span><h1>{home} vs {away}</h1><p>Record one event at a time against this fixture. Reports from independent collectors are compared before publication.</p></div>{user?<div className="collector-identity"><UserCheck/><span><small>COLLECTING AS</small><b>@{user.username}</b><em>{user.displayName} · {user.role}</em></span></div>:<Link className="collector-signin" href="/signin">Sign in to collect</Link>}</div>

    {!authorised&&user!==undefined&&<div className="collector-access"><AlertTriangle/><span><b>{user?'Collector access required':'You are not signed in'}</b>{user?'Ask an administrator to assign the Collector role to this account.':'Sign in with your unique collector account. Your username and user ID will identify every submission.'}</span>{!user&&<Link href="/signin">Sign in</Link>}</div>}
    <div className="collector-guide"><Radio/><div><b>Possession definition</b><span>Record timed possession intervals. Touch events do not determine possession percentage.</span></div></div>

    <div className="collector-layout"><form className="collector-form" onSubmit={submit}>
      <div className="collector-form-heading wide"><span>NEW OBSERVATION</span><small>{home} vs {away} · {id}</small></div>
      <label>Event type<select value={eventType} onChange={e=>{setEventType(e.target.value);setResult(null)}}><option>GOAL</option><option>SHOT</option><option>TOUCH</option><option>FREE_KICK</option><option>CORNER</option><option>FOUL</option><option>PENALTY</option><option>YELLOW_CARD</option><option>RED_CARD</option><option>SUBSTITUTION</option><option>POSSESSION_INTERVAL</option></select></label>
      <label>Match minute<input type="number" min="0" max="130" value={minute} onChange={e=>setMinute(Number(e.target.value))}/></label>
      <label>Team<select value={team} onChange={e=>{setTeam(e.target.value);setPlayerId('')}}><option value="home">{home}</option><option value="away">{away}</option></select></label>
      {requiresPlayer&&<label>Primary player<select required value={playerId} onChange={e=>setPlayerId(e.target.value)}><option value="">Select player</option>{teamPlayers.map(player=><option key={player.id} value={player.id}>{player.shirtNumber?`${player.shirtNumber} · `:''}{player.name} · {player.position}</option>)}<option value="__unlisted__">Player not listed…</option></select></label>}
      {playerId==='__unlisted__'&&requiresPlayer&&<label className="wide claim-field">Unlisted player name<input required value={unlistedName} onChange={e=>setUnlistedName(e.target.value)}/></label>}
      {['GOAL','SHOT'].includes(eventType)&&<><label>Method<select value={method} onChange={e=>setMethod(e.target.value)}><option>RIGHT_FOOT</option><option>LEFT_FOOT</option><option>HEAD</option><option>OTHER</option></select></label><label>Distance (metres)<input type="number" min="0" max="100" value={distance} onChange={e=>setDistance(Number(e.target.value))}/></label></>}
      {eventType==='GOAL'&&<label className="check-field"><input type="checkbox" checked={isPenalty} onChange={e=>setIsPenalty(e.target.checked)}/> Penalty goal</label>}
      {['SHOT','FREE_KICK','PENALTY'].includes(eventType)&&<label>Outcome<select value={outcome} onChange={e=>setOutcome(e.target.value)}>{eventType==='FREE_KICK'?<><option>AWARDED</option><option>TAKEN</option><option>ON_TARGET</option><option>OFF_TARGET</option><option>BLOCKED</option><option>GOAL</option></>:eventType==='PENALTY'?<><option>SCORED</option><option>SAVED</option><option>MISSED</option><option>WOODWORK</option></>:<><option>ON_TARGET</option><option>OFF_TARGET</option><option>BLOCKED</option><option>WOODWORK</option><option>GOAL</option></>}</select></label>}
      {eventType==='FREE_KICK'&&<label>Distance (metres)<input type="number" min="0" max="100" value={distance} onChange={e=>setDistance(Number(e.target.value))}/></label>}
      {eventType==='CORNER'&&<label>Corner side<select value={side} onChange={e=>setSide(e.target.value)}><option>LEFT</option><option>RIGHT</option></select></label>}
      {eventType==='FOUL'&&<>{playerOptions(fouledPlayer,setFouledPlayer,'Player fouled')}<label>Foul type<select value={foulType} onChange={e=>setFoulType(e.target.value)}><option>TRIP</option><option>PUSH</option><option>HANDBALL</option><option>TACKLE</option><option>HOLDING</option><option>OTHER</option></select></label></>}
      {eventType==='TOUCH'&&<><label>Pitch X (0–100)<input type="number" min="0" max="100" value={x} onChange={e=>setX(Number(e.target.value))}/></label><label>Pitch Y (0–100)<input type="number" min="0" max="100" value={y} onChange={e=>setY(Number(e.target.value))}/></label></>}
      {eventType==='POSSESSION_INTERVAL'&&<label>Possession duration (seconds)<input type="number" min="1" max="600" value={duration} onChange={e=>setDuration(Number(e.target.value))}/></label>}
      {eventType==='SUBSTITUTION'&&<>{playerOptions(playerOn,setPlayerOn,'Player on')}{playerOptions(playerOff,setPlayerOff,'Player off')}</>}
      <label className="wide">Event reference<input required value={eventKey} onChange={e=>setEventKey(e.target.value)}/><small>Use the same reference when another collector reports this exact event.</small></label>
      <button className="primary" disabled={sending||!authorised} type="submit"><Send/>{sending?'Submitting…':'Submit observation'}</button>
    </form>
    <aside className="submission-result"><ShieldCheck/><h2>Verification</h2><small className="result-match">{home} vs {away} · {minute}&apos;</small>{!result&&!error&&<p>The verification state will appear after submission.</p>}{error&&<div className="result-error"><b>Submission failed</b><span>{error}</span></div>}{result?.queued&&<div className="result-status queued"><span><WifiOff/>QUEUED OFFLINE</span><p>Saved on this device. It will submit automatically when connectivity returns.</p></div>}{result&&!result.queued&&<div className={`result-status ${result.status.toLowerCase()}`}><span>{result.status==='CONSENSUS'?<CheckCircle2/>:<Radio/>}{result.status}</span><dl><div><dt>Match</dt><dd>{id}</dd></div><div><dt>Collector</dt><dd>@{user?.username}</dd></div><div><dt>Subject</dt><dd>{result.playerId??result.subjectId}</dd></div><div><dt>Identity</dt><dd>{result.identityStatus??'—'}</dd></div><div><dt>Sources</dt><dd>{result.agreeingSources??'—'}</dd></div><div><dt>Confidence</dt><dd>{result.confidence?`${Math.round(result.confidence*100)}%`:'—'}</dd></div></dl></div>}</aside></div>
  </main>;
}
