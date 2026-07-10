import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const { PublicDataService }=require('../dist/public-data.service.js');

test('standings are recalculated from finished fixtures only',async()=>{
  const teams=[{id:'dyn',name:'Dynamos'},{id:'caps',name:'CAPS United'}];
  const db={
    seasonTeam:{findMany:async()=>teams.map((team,index)=>({team,pointsDeduction:index===1?1:0}))},
    match:{findMany:async()=>[
      {homeTeamId:'dyn',awayTeamId:'caps',homeScore:2,awayScore:1},
      {homeTeamId:'caps',awayTeamId:'dyn',homeScore:0,awayScore:0}
    ]}
  };
  const table=await new PublicDataService(db).standings('season-1');
  assert.deepEqual(table.map(row=>({id:row.team.id,played:row.played,wins:row.wins,draws:row.draws,losses:row.losses,points:row.points,goalDifference:row.goalDifference})),[
    {id:'dyn',played:2,wins:1,draws:1,losses:0,points:4,goalDifference:1},
    {id:'caps',played:2,wins:0,draws:1,losses:1,points:0,goalDifference:-1}
  ]);
});
