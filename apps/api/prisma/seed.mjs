import client from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';
const { PrismaClient }=client;
const db=new PrismaClient();
if(process.env.NODE_ENV==='production'&&process.env.ALLOW_DEMO_SEED!=='true')throw new Error('Demo seeding is disabled in production');
if(process.env.ALLOW_DEMO_SEED!=='true')throw new Error('Set ALLOW_DEMO_SEED=true before loading demo data');
const pepper=process.env.PASSWORD_PEPPER;if(!pepper)throw new Error('PASSWORD_PEPPER is required');
const passwordValue=process.env.DEMO_PASSWORD??'DemoPass!2026';
const password=()=>{const salt=randomBytes(16).toString('hex');return`scrypt$${salt}$${scryptSync(passwordValue+pepper,salt,64).toString('hex')}`};
const date=value=>new Date(value);
const user=async(id,email,username,displayName,role)=>db.user.upsert({where:{email},update:{username,displayName,role,passwordHash:password(),emailVerifiedAt:new Date()},create:{id,email,username,displayName,role,passwordHash:password(),emailVerifiedAt:new Date(),reputation:role==='COLLECTOR'?92:0}});

async function seed(){
  const competition=await db.competition.upsert({where:{name_countryCode:{name:'Premier Soccer League',countryCode:'ZW'}},update:{},create:{id:'demo-competition-psl',name:'Premier Soccer League',countryCode:'ZW'}});
  const season=await db.season.upsert({where:{competitionId_label:{competitionId:competition.id,label:'2026'}},update:{startsAt:date('2026-01-01'),endsAt:date('2026-12-31')},create:{id:'demo-season-2026',competitionId:competition.id,label:'2026',startsAt:date('2026-01-01'),endsAt:date('2026-12-31')}});
  const venueData=[['demo-venue-wadzanai','wadzanai-stadium','Wadzanai Stadium','Shamva'],['demo-venue-rufaro','rufaro-stadium','Rufaro Stadium','Harare'],['demo-venue-barbourfields','barbourfields-stadium','Barbourfields Stadium','Bulawayo'],['demo-venue-baobab','baobab-stadium','Baobab Stadium','Ngezi']];
  const venues={};for(const [id,slug,name,city] of venueData)venues[slug]=await db.venue.upsert({where:{slug},update:{name,city},create:{id,slug,name,city,countryCode:'ZW'}});
  const teamData=[
    ['demo-team-simba','simba-bhora','Simba Bhora','SIM','Shamva',2008,'#d6a719','#12261e','wadzanai-stadium'],
    ['demo-team-fcp','fc-platinum','FC Platinum','FCP','Zvishavane',1995,'#1f7fc1','#ffffff',null],
    ['demo-team-dynamos','dynamos','Dynamos','DYN','Harare',1963,'#1769aa','#ffffff','rufaro-stadium'],
    ['demo-team-highlanders','highlanders','Highlanders','HIG','Bulawayo',1926,'#111827','#ffffff','barbourfields-stadium'],
    ['demo-team-ngezi','ngezi-platinum','Ngezi Platinum','NGE','Ngezi',2001,'#e86732','#111827','baobab-stadium'],
    ['demo-team-caps','caps-united','CAPS United','CAP','Harare',1973,'#16834f','#ffffff','rufaro-stadium']
  ];
  const teams={};for(const [id,slug,name,shortName,city,foundedYear,primaryColor,secondaryColor,venueSlug] of teamData){teams[slug]=await db.team.upsert({where:{slug},update:{name,shortName,city,foundedYear,primaryColor,secondaryColor,homeVenueId:venueSlug?venues[venueSlug].id:null},create:{id,slug,name,shortName,city,foundedYear,primaryColor,secondaryColor,homeVenueId:venueSlug?venues[venueSlug].id:null}});await db.seasonTeam.upsert({where:{seasonId_teamId:{seasonId:season.id,teamId:id}},update:{},create:{seasonId:season.id,teamId:id}})}
  const playerData=[
    ['demo-player-musona','walter-musona','Walter Musona','Forward','simba-bhora',10,'Right'],['demo-player-mvula','t-mvula','Tafadzwa Mvula','Goalkeeper','simba-bhora',1,'Right'],
    ['demo-player-banda','brian-banda','Brian Banda','Midfielder','fc-platinum',8,'Right'],['demo-player-bello','gift-bello','Gift Bello','Defender','fc-platinum',4,'Right'],
    ['demo-player-murwira','godknows-murwira','Godknows Murwira','Midfielder','dynamos',7,'Right'],['demo-player-moyo','tawanda-moyo-player','Tawanda Moyo','Forward','dynamos',9,'Left'],
    ['demo-player-ngwenya','thandolwenkosi-ngwenya','Thandolwenkosi Ngwenya','Forward','highlanders',11,'Right'],['demo-player-ncube','bhekimpilo-ncube','Bhekimpilo Ncube','Defender','highlanders',5,'Left'],
    ['demo-player-benhura','takunda-benhura','Takunda Benhura','Forward','ngezi-platinum',9,'Right'],['demo-player-mukamba','denver-mukamba','Denver Mukamba','Midfielder','ngezi-platinum',10,'Right'],
    ['demo-player-mahachi','kuda-mahachi','Kuda Mahachi','Winger','caps-united',11,'Left'],['demo-player-jaure','partson-jaure','Partson Jaure','Defender','caps-united',4,'Right']
  ];
  const players={};for(const [id,slug,legalName,position,teamSlug,shirtNumber,preferredFoot] of playerData){players[slug]=await db.player.upsert({where:{slug},update:{legalName,position,preferredFoot},create:{id,slug,legalName,position,preferredFoot,nationalityCode:'ZW'}});await db.playerRegistration.upsert({where:{id:`demo-registration-${slug}`},update:{teamId:teams[teamSlug].id,seasonId:season.id,shirtNumber},create:{id:`demo-registration-${slug}`,playerId:id,teamId:teams[teamSlug].id,seasonId:season.id,shirtNumber,startsAt:date('2026-01-01')}})}
  const matchData=[
    ['demo-match-sim-dyn','simba-bhora','dynamos','2026-04-05T13:00:00Z','FINISHED',2,0,'Matchday 1','wadzanai-stadium'],
    ['demo-match-fcp-hig','fc-platinum','highlanders','2026-04-06T13:00:00Z','FINISHED',1,0,'Matchday 1','barbourfields-stadium'],
    ['demo-match-nge-cap','ngezi-platinum','caps-united','2026-04-06T13:00:00Z','FINISHED',1,1,'Matchday 1','baobab-stadium'],
    ['demo-match-dyn-fcp','dynamos','fc-platinum','2026-05-10T13:00:00Z','FINISHED',1,1,'Matchday 8','rufaro-stadium'],
    ['demo-match-hig-sim','highlanders','simba-bhora','2026-05-11T13:00:00Z','FINISHED',0,1,'Matchday 8','barbourfields-stadium'],
    ['demo-match-cap-nge','caps-united','ngezi-platinum','2026-05-11T13:00:00Z','FINISHED',2,1,'Matchday 8','rufaro-stadium'],
    ['demo-match-sim-fcp','simba-bhora','fc-platinum','2026-07-08T13:00:00Z','LIVE',2,1,'Matchday 19','wadzanai-stadium'],
    ['demo-match-dyn-hig','dynamos','highlanders','2026-07-12T13:00:00Z','SCHEDULED',0,0,'Matchday 20','rufaro-stadium'],
    ['demo-match-nge-sim','ngezi-platinum','simba-bhora','2026-07-13T13:00:00Z','SCHEDULED',0,0,'Matchday 20','baobab-stadium']
  ];
  const matches={};for(const [id,homeSlug,awaySlug,kickoffAt,status,homeScore,awayScore,round,venueSlug] of matchData)matches[id]=await db.match.upsert({where:{id},update:{status,homeScore,awayScore},create:{id,seasonId:season.id,homeTeamId:teams[homeSlug].id,awayTeamId:teams[awaySlug].id,kickoffAt:date(kickoffAt),status,homeScore,awayScore,round,venueId:venues[venueSlug].id}});
  for(const player of Object.values(players)){const registration=await db.playerRegistration.findFirst({where:{playerId:player.id,seasonId:season.id}});for(const match of Object.values(matches)){if(registration&&[match.homeTeamId,match.awayTeamId].includes(registration.teamId))await db.matchParticipant.upsert({where:{matchId_playerId:{matchId:match.id,playerId:player.id}},update:{},create:{matchId:match.id,playerId:player.id,teamId:registration.teamId,source:'SEASON_REGISTRATION',shirtNumber:registration.shirtNumber}})}}
  const admin=await user('demo-user-admin','admin@demo.technsports.test','demo_admin','Demo Administrator','ADMIN');const collector1=await user('demo-user-collector-1','collector1@demo.technsports.test','demo_collector_1','Tawanda Demo','COLLECTOR');const collector2=await user('demo-user-collector-2','collector2@demo.technsports.test','demo_collector_2','Ruvimbo Demo','COLLECTOR');await user('demo-user-reviewer','reviewer@demo.technsports.test','demo_reviewer','Demo Reviewer','REVIEWER');await user('demo-user-editor','editor@demo.technsports.test','demo_editor','Demo Editor','EDITOR');
  for(const [person,slug,province,specialties] of [[collector1,'tawanda-demo','Harare',['Live events','Team statistics']],[collector2,'ruvimbo-demo','Mashonaland Central',['Lineups','Player actions']]])await db.contributorProfile.upsert({where:{userId:person.id},update:{publicVisible:true,verifiedAt:new Date()},create:{userId:person.id,publicSlug:slug,bio:'Demo contributor profile used to exercise the TechnSports collection workflow.',coverageProvince:province,specialties,publicVisible:true,verifiedAt:new Date()}});
  for(const person of [collector1,collector2])await db.assignment.upsert({where:{matchId_userId_scope:{matchId:'demo-match-sim-fcp',userId:person.id,scope:'TIMELINE'}},update:{acceptedAt:new Date()},create:{id:`demo-assignment-${person.id}`,matchId:'demo-match-sim-fcp',userId:person.id,scope:'TIMELINE',acceptedAt:new Date()}});
  const observationData=[['demo-observation-goal-1',collector1.id,'demo-goal-67-c1'],['demo-observation-goal-2',collector2.id,'demo-goal-67-c2']];for(const [id,contributorId,clientEventId] of observationData)await db.observation.upsert({where:{contributorId_clientEventId:{contributorId,clientEventId}},update:{status:'CONSENSUS'},create:{id,matchId:'demo-match-sim-fcp',contributorId,eventType:'GOAL',subjectId:players['walter-musona'].id,playerId:players['walter-musona'].id,matchSecond:4020,payload:{team:'home',scoringMethod:'RIGHT_FOOT',distanceMeters:18,isPenalty:false},clientEventId,clientRecordedAt:new Date(),status:'CONSENSUS'}});
  await db.matchFact.upsert({where:{id:'demo-fact-live-goal'},update:{},create:{id:'demo-fact-live-goal',matchId:'demo-match-sim-fcp',factType:'GOAL',subjectId:players['walter-musona'].id,matchSecond:4020,value:{team:'home',playerId:players['walter-musona'].id},confidence:.75,sourceCount:2,publishedAt:new Date()}});
  await db.transfer.upsert({where:{id:'demo-transfer-mahachi'},update:{},create:{id:'demo-transfer-mahachi',playerId:players['kuda-mahachi'].id,fromTeamId:teams['caps-united'].id,toTeamId:teams['highlanders'].id,type:'PERMANENT',announcedAt:date('2026-07-02'),effectiveAt:date('2026-07-15'),verified:true,feeDisclosed:false}});
  const articles=[['demo-article-title-race','title-race-2026','Title race enters a decisive phase','Standings and recent results put the leading clubs under the microscope.','ANALYSIS'],['demo-article-match-report','simba-bhora-fc-platinum-report','Simba Bhora edge FC Platinum','Verified match events explain the turning point at Wadzanai Stadium.','MATCH REPORT'],['demo-article-transfer','verified-transfer-roundup','Zimbabwe transfer roundup','Every verified Premier Soccer League move from the current window.','TRANSFERS']];for(const [id,slug,title,excerpt,category] of articles)await db.article.upsert({where:{slug},update:{title,excerpt},create:{id,slug,title,excerpt,category,authorName:'TechnSports Data Desk',body:{format:'plain_text',text:`${excerpt}\n\nThis demo article is stored in PostgreSQL and rendered through the public editorial API.`},status:'PUBLISHED',publishedAt:new Date()}});
  console.log(`Demo database ready: ${Object.keys(teams).length} teams, ${Object.keys(players).length} players, ${Object.keys(matches).length} matches. Demo password: ${passwordValue}`);
}
seed().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>db.$disconnect());
