'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarPlus, CheckCircle2, Database, ImageUp, ListChecks, MapPin, ShieldAlert, Trophy, UserPlus, Users } from 'lucide-react';

type Season={id:string;label:string;startsAt:string;endsAt:string;competitionId:string};
type Competition={id:string;name:string;countryCode:string;seasons:Season[]};
type Team={id:string;name:string;shortName:string;primaryColor?:string};
type Venue={id:string;name:string;city:string};
type Player={id:string;legalName:string;knownAs?:string;position:string;registrations?:{team:Team;seasonId:string;shirtNumber?:number}[]};
type Fixture={id:string;seasonId:string;round?:string;status:string;homeScore:number;awayScore:number;kickoffAt:string;homeTeam:Team;awayTeam:Team;venue?:Venue;participants?:{player:Player;team:Team;source:string;confirmed:boolean}[]};
type Registration={team:Team};

export default function AdminPage(){
  const api=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000/api/v1';
  const [key,setKey]=useState('');
  const [competitions,setCompetitions]=useState<Competition[]>([]);
  const [teams,setTeams]=useState<Team[]>([]);
  const [venues,setVenues]=useState<Venue[]>([]);
  const [players,setPlayers]=useState<Player[]>([]);
  const [fixtures,setFixtures]=useState<Fixture[]>([]);
  const [seasonId,setSeasonId]=useState('');
  const [registered,setRegistered]=useState<Registration[]>([]);
  const [crestUrl,setCrestUrl]=useState('');
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');

  const seasons=useMemo(()=>competitions.flatMap(c=>c.seasons.map(s=>({...s,competitionName:c.name}))),[competitions]);
  const selectedFixtureTeams=(fixtureId:string)=>{const match=fixtures.find(f=>f.id===fixtureId);return match?[match.homeTeam,match.awayTeam]:teams};

  const load=useCallback(async()=>{
    try{
      const [c,t,v,p,f]=await Promise.all([
        fetch(`${api}/catalog/competitions`,{credentials:'include'}),
        fetch(`${api}/catalog/teams`,{credentials:'include'}),
        fetch(`${api}/catalog/venues`,{credentials:'include'}),
        fetch(`${api}/catalog/players`,{credentials:'include'}),
        fetch(`${api}/catalog/fixtures${seasonId?`?seasonId=${seasonId}`:''}`,{credentials:'include'})
      ]);
      if(!c.ok||!t.ok||!v.ok||!p.ok||!f.ok)throw new Error('Database catalogue is unavailable');
      setCompetitions(await c.json());setTeams(await t.json());setVenues(await v.json());setPlayers(await p.json());setFixtures(await f.json());
    }catch(e){setError(e instanceof Error?e.message:'Could not load catalogue')}
  },[api,seasonId]);

  useEffect(()=>{load()},[load]);
  useEffect(()=>{if(!seasonId){setRegistered([]);return}fetch(`${api}/catalog/seasons/${seasonId}/teams`,{credentials:'include'}).then(r=>r.json()).then(setRegistered).catch(()=>setRegistered([]))},[api,seasonId]);

  const post=async(path:string,body:unknown)=>{
    setError('');setNotice('');
    const response=await fetch(`${api}${path}`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','x-admin-key':key},body:JSON.stringify(body)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(Array.isArray(data.message)?data.message.join(', '):data.message||'Request failed');
    return data;
  };
  const handle=async(e:FormEvent<HTMLFormElement>,action:(data:FormData)=>Promise<void>,success:string)=>{
    e.preventDefault();
    try{await action(new FormData(e.currentTarget));setNotice(success);e.currentTarget.reset();await load()}
    catch(err){setError(err instanceof Error?err.message:'Operation failed')}
  };
  const uploadLogo=async(file?:File)=>{
    if(!file)return;
    const form=new FormData();form.append('file',file);
    const response=await fetch(`${api}/admin/uploads/team-logo`,{method:'POST',credentials:'include',headers:{'x-admin-key':key},body:form});
    const data=await response.json();
    if(!response.ok)throw new Error(Array.isArray(data.message)?data.message.join(', '):data.message);
    setCrestUrl(data.url);setNotice('Team logo uploaded');
  };

  return <main className="page-shell admin-shell">
    <div className="directory-head"><span className="eyebrow">DATA OPERATIONS</span><h1>TechnSports operations console</h1><p>Production data entry for competitions, clubs, players, fixtures, confirmed lineups and match status.</p></div>
    <div className="admin-warning"><ShieldAlert/><span><b>Role protected</b>Sign in as ADMIN for full access. The API key field remains available only if you configure ADMIN_API_KEY.</span><label>Admin API key<input type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="Optional"/></label></div>
    {notice&&<div className="admin-notice"><CheckCircle2/>{notice}</div>}{error&&<div className="admin-error">{error}</div>}

    <section className="admin-section"><span className="eyebrow">FOUNDATION</span><div className="admin-grid">
      <AdminCard icon={<Trophy/>} step="01" title="Create competition"><form onSubmit={e=>handle(e,async f=>{await post('/admin/competitions',{name:f.get('name'),countryCode:f.get('countryCode')})},'Competition created')}><label>Name<input name="name" required placeholder="Premier Soccer League"/></label><label>Country code<input name="countryCode" required defaultValue="ZW" minLength={2} maxLength={2}/></label><button>Create competition</button></form></AdminCard>
      <AdminCard icon={<CalendarPlus/>} step="02" title="Create season"><form onSubmit={e=>handle(e,async f=>{await post(`/admin/competitions/${f.get('competitionId')}/seasons`,{label:f.get('label'),startsAt:new Date(`${f.get('startsAt')}T00:00:00`).toISOString(),endsAt:new Date(`${f.get('endsAt')}T23:59:59`).toISOString()})},'Season created')}><label>Competition<select name="competitionId" required defaultValue=""><option value="" disabled>Select competition</option>{competitions.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label>Season label<input name="label" required placeholder="2027"/></label><label>Starts<input name="startsAt" required type="date"/></label><label>Ends<input name="endsAt" required type="date"/></label><button>Create season</button></form></AdminCard>
      <AdminCard icon={<MapPin/>} step="03" title="Create venue"><form onSubmit={e=>handle(e,async f=>{await post('/admin/venues',{name:f.get('name'),city:f.get('city'),countryCode:f.get('countryCode')||'ZW',latitude:f.get('latitude')?Number(f.get('latitude')):undefined,longitude:f.get('longitude')?Number(f.get('longitude')):undefined})},'Venue created')}><label>Venue<input name="name" required placeholder="National Sports Stadium"/></label><label>City<input name="city" required placeholder="Harare"/></label><label>Country code<input name="countryCode" defaultValue="ZW" maxLength={2}/></label><label>Latitude<input name="latitude" type="number" step="0.000001"/></label><label>Longitude<input name="longitude" type="number" step="0.000001"/></label><button>Create venue</button></form></AdminCard>
      <AdminCard icon={<Users/>} step="04" title="Create club"><form onSubmit={e=>handle(e,async f=>{await post('/admin/teams',{name:f.get('name'),shortName:f.get('shortName'),crestUrl:crestUrl||undefined,city:f.get('city')||undefined,foundedYear:f.get('foundedYear')?Number(f.get('foundedYear')):undefined,websiteUrl:f.get('websiteUrl')||undefined,primaryColor:f.get('primaryColor')||undefined,secondaryColor:f.get('secondaryColor')||undefined});setCrestUrl('')},'Club created')}><label>Club name<input name="name" required/></label><label>Short name<input name="shortName" required maxLength={8}/></label><label>City<input name="city"/></label><label>Founded<input name="foundedYear" type="number" min="1850" max="2100"/></label><label>Website<input name="websiteUrl" type="url"/></label><label>Primary colour<input name="primaryColor" type="color"/></label><label>Secondary colour<input name="secondaryColor" type="color"/></label><label className="cover-upload"><ImageUp/><span>Upload team logo</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>uploadLogo(e.target.files?.[0]).catch(reason=>setError(reason.message))}/><small>Validated JPG, PNG or WebP · maximum 5 MB</small></label><label>Logo URL<input value={crestUrl} onChange={e=>setCrestUrl(e.target.value)} type="url" placeholder="Uploaded URL appears here"/></label><button>Create club</button></form></AdminCard>
    </div></section>

    <section className="admin-section"><span className="eyebrow">SQUADS</span><div className="admin-grid">
      <AdminCard icon={<Database/>} step="05" title="Register club in season"><form onSubmit={e=>handle(e,async f=>{await post(`/admin/seasons/${f.get('seasonId')}/teams`,{teamId:f.get('teamId')})},'Club registered in season')}><label>Season<select name="seasonId" required defaultValue=""><option value="" disabled>Select season</option>{seasons.map(s=><option value={s.id} key={s.id}>{s.competitionName} · {s.label}</option>)}</select></label><label>Club<select name="teamId" required defaultValue=""><option value="" disabled>Select club</option>{teams.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></label><button>Register club</button></form></AdminCard>
      <AdminCard icon={<UserPlus/>} step="06" title="Create player"><form onSubmit={e=>handle(e,async f=>{await post('/admin/players',{legalName:f.get('legalName'),knownAs:f.get('knownAs')||undefined,dateOfBirth:f.get('dateOfBirth')?new Date(`${f.get('dateOfBirth')}T00:00:00`).toISOString():undefined,nationalityCode:f.get('nationalityCode')||'ZW',preferredFoot:f.get('preferredFoot')||undefined,position:f.get('position')})},'Player created')}><label>Legal name<input name="legalName" required/></label><label>Known as<input name="knownAs"/></label><label>Date of birth<input name="dateOfBirth" type="date"/></label><label>Nationality<input name="nationalityCode" defaultValue="ZW" maxLength={2}/></label><label>Preferred foot<select name="preferredFoot" defaultValue=""><option value="">Unknown</option><option>LEFT</option><option>RIGHT</option><option>BOTH</option></select></label><label>Position<input name="position" required placeholder="FW"/></label><button>Create player</button></form></AdminCard>
      <AdminCard icon={<ListChecks/>} step="07" title="Register player to club"><form onSubmit={e=>handle(e,async f=>{await post('/admin/players/registrations',{playerId:f.get('playerId'),teamId:f.get('teamId'),seasonId:f.get('seasonId'),shirtNumber:f.get('shirtNumber')?Number(f.get('shirtNumber')):undefined,startsAt:new Date(`${f.get('startsAt')}T00:00:00`).toISOString(),endsAt:f.get('endsAt')?new Date(`${f.get('endsAt')}T23:59:59`).toISOString():undefined})},'Player registration created')}><label>Player<select name="playerId" required defaultValue=""><option value="" disabled>Select player</option>{players.map(p=><option value={p.id} key={p.id}>{p.knownAs||p.legalName} · {p.position}</option>)}</select></label><label>Season<select name="seasonId" required defaultValue=""><option value="" disabled>Select season</option>{seasons.map(s=><option value={s.id} key={s.id}>{s.competitionName} · {s.label}</option>)}</select></label><label>Club<select name="teamId" required defaultValue=""><option value="" disabled>Select club</option>{teams.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></label><label>Shirt number<input name="shirtNumber" type="number" min="1" max="99"/></label><label>Starts<input name="startsAt" required type="date"/></label><label>Ends<input name="endsAt" type="date"/></label><button>Register player</button></form></AdminCard>
    </div></section>

    <section className="fixture-admin"><div><span className="eyebrow">MATCH OPERATIONS</span><h2>Add fixture</h2><p>Use registered clubs, a canonical venue, and an exact kickoff time. The same match becomes available to collectors.</p></div><form onSubmit={e=>handle(e,async f=>{await post('/admin/fixtures',{seasonId:f.get('seasonId'),homeTeamId:f.get('homeTeamId'),awayTeamId:f.get('awayTeamId'),kickoffAt:new Date(String(f.get('kickoffAt'))).toISOString(),round:f.get('round')||undefined,venueId:f.get('venueId')||undefined,venueName:f.get('venueName')||undefined})},'Fixture added to the schedule')}><label>Season<select name="seasonId" required value={seasonId} onChange={e=>setSeasonId(e.target.value)}><option value="">Select season</option>{seasons.map(s=><option value={s.id} key={s.id}>{s.competitionName} · {s.label}</option>)}</select></label><label>Home club<select name="homeTeamId" required defaultValue=""><option value="" disabled>Select home club</option>{registered.map(r=><option value={r.team.id} key={r.team.id}>{r.team.name}</option>)}</select></label><label>Away club<select name="awayTeamId" required defaultValue=""><option value="" disabled>Select away club</option>{registered.map(r=><option value={r.team.id} key={r.team.id}>{r.team.name}</option>)}</select></label><label>Kickoff<input name="kickoffAt" required type="datetime-local"/></label><label>Round<input name="round" placeholder="Matchday 1"/></label><label>Venue<select name="venueId" defaultValue=""><option value="">Use typed venue name</option>{venues.map(v=><option value={v.id} key={v.id}>{v.name} · {v.city}</option>)}</select></label><label>Venue name fallback<input name="venueName" placeholder="If venue not yet created"/></label><button>Add fixture</button></form></section>

    <section className="admin-section"><div className="records-heading"><div><span className="eyebrow">LIVE CONTROL</span><h2>Fixture status, scores and lineups</h2></div></div><div className="ops-grid">
      <form className="ops-card" onSubmit={e=>handle(e,async f=>{await post(`/admin/fixtures/${f.get('fixtureId')}`,{status:f.get('status'),homeScore:Number(f.get('homeScore')||0),awayScore:Number(f.get('awayScore')||0),round:f.get('round')||undefined,venueId:f.get('venueId')||undefined})},'Fixture updated')}>
        <h3>Update match state</h3><label>Fixture<select name="fixtureId" required>{fixtures.map(f=><option value={f.id} key={f.id}>{f.homeTeam.name} v {f.awayTeam.name} · {new Date(f.kickoffAt).toLocaleDateString('en-ZW')}</option>)}</select></label><label>Status<select name="status"><option>SCHEDULED</option><option>LIVE</option><option>SUSPENDED</option><option>POSTPONED</option><option>ABANDONED</option><option>FINISHED</option></select></label><label>Home score<input name="homeScore" type="number" min="0" defaultValue={0}/></label><label>Away score<input name="awayScore" type="number" min="0" defaultValue={0}/></label><label>Round<input name="round"/></label><label>Venue<select name="venueId" defaultValue=""><option value="">No change / typed fallback</option>{venues.map(v=><option value={v.id} key={v.id}>{v.name}</option>)}</select></label><button>Save match state</button>
      </form>
      <LineupForm fixtures={fixtures} players={players} teamsForFixture={selectedFixtureTeams} onSubmit={(fixtureId,teamId,playerIds)=>post(`/admin/fixtures/${fixtureId}/lineups`,{teamId,playerIds}).then(()=>load()).then(()=>setNotice('Confirmed lineup saved')).catch(e=>setError(e instanceof Error?e.message:'Could not save lineup'))}/>
    </div></section>
  </main>
}

function AdminCard({icon,step,title,children}:{icon:React.ReactNode;step:string;title:string;children:React.ReactNode}){return <section className="admin-card"><header>{icon}<span>STEP {step}</span></header><h2>{title}</h2>{children}</section>}

function LineupForm({fixtures,players,teamsForFixture,onSubmit}:{fixtures:Fixture[];players:Player[];teamsForFixture:(fixtureId:string)=>Team[];onSubmit:(fixtureId:string,teamId:string,playerIds:string[])=>void}){
  const [fixtureId,setFixtureId]=useState('');const [teamId,setTeamId]=useState('');const [selected,setSelected]=useState<string[]>([]);
  const teams=fixtureId?teamsForFixture(fixtureId):[];
  useEffect(()=>{if(fixtures[0]&&!fixtureId)setFixtureId(fixtures[0].id)},[fixtures,fixtureId]);
  useEffect(()=>{if(teams[0]&&!teams.some(t=>t.id===teamId))setTeamId(teams[0].id)},[teams,teamId]);
  const eligible=players.filter(player=>player.registrations?.some(reg=>reg.team.id===teamId));
  const toggle=(id:string)=>setSelected(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
  return <form className="ops-card lineup-card" onSubmit={e=>{e.preventDefault();onSubmit(fixtureId,teamId,selected)}}>
    <h3>Confirm lineup / squad</h3><label>Fixture<select value={fixtureId} onChange={e=>{setFixtureId(e.target.value);setSelected([])}}>{fixtures.map(f=><option value={f.id} key={f.id}>{f.homeTeam.name} v {f.awayTeam.name}</option>)}</select></label><label>Team<select value={teamId} onChange={e=>{setTeamId(e.target.value);setSelected([])}}>{teams.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></label>
    <div className="lineup-picker">{eligible.map(player=><label key={player.id}><input type="checkbox" checked={selected.includes(player.id)} onChange={()=>toggle(player.id)}/><span>{player.knownAs||player.legalName}<small>{player.position} · {player.registrations?.[0]?.shirtNumber?`#${player.registrations[0].shirtNumber}`:'No #'} · {player.id}</small></span></label>)}</div>
    <button disabled={!fixtureId||!teamId||!selected.length}>Save confirmed lineup</button>
  </form>
}
