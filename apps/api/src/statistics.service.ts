import { Injectable } from '@nestjs/common';

export type VerifiedFact = {
  type: 'GOAL'|'SHOT'|'TOUCH'|'FREE_KICK'|'CORNER'|'FOUL'|'PENALTY'|'YELLOW_CARD'|'RED_CARD'|'SUBSTITUTION'|'POSSESSION_INTERVAL'|'APPEARANCE'|'ASSIST'|'MATCH_RESULT';
  teamId: string;
  opponentId?: string;
  playerId?: string;
  seasonId?: string;
  venueId?: string;
  location?: 'HOME'|'AWAY'|'NEUTRAL';
  outcome?: 'WIN'|'DRAW'|'LOSS';
  payload?: Record<string,unknown>;
};

export type StatsFilter = { seasonId?: string; venueId?: string; location?: 'HOME'|'AWAY'|'NEUTRAL' };

@Injectable()
export class StatisticsService {
  clubRecords(teamId: string, facts: VerifiedFact[], filter: StatsFilter = {}) {
    const selected = facts.filter(f => f.teamId === teamId && (!filter.seasonId || f.seasonId === filter.seasonId) && (!filter.venueId || f.venueId === filter.venueId) && (!filter.location || f.location === filter.location));
    const results = selected.filter(f => f.type === 'MATCH_RESULT');
    return {
      matches: results.length,
      wins: results.filter(f => f.outcome === 'WIN').length,
      draws: results.filter(f => f.outcome === 'DRAW').length,
      losses: results.filter(f => f.outcome === 'LOSS').length,
      goals: selected.filter(f => f.type === 'GOAL').length,
      yellowCards: selected.filter(f => f.type === 'YELLOW_CARD').length,
      redCards: selected.filter(f => f.type === 'RED_CARD').length,
      points: results.reduce((sum, f) => sum + (f.outcome === 'WIN' ? 3 : f.outcome === 'DRAW' ? 1 : 0), 0),
      split: filter,
      source: 'verified-match-facts',
    };
  }

  playerClubRecord(playerId: string, facts: VerifiedFact[]) {
    const selected = facts.filter(f => f.playerId === playerId);
    return Object.values(selected.reduce<Record<string, { teamId: string; appearances: number; goals: number; assists: number; yellowCards: number; redCards: number }>>((clubs, fact) => {
      const row = clubs[fact.teamId] ??= { teamId: fact.teamId, appearances: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
      if (fact.type === 'APPEARANCE') row.appearances++;
      if (fact.type === 'GOAL') row.goals++;
      if (fact.type === 'ASSIST') row.assists++;
      if (fact.type === 'YELLOW_CARD') row.yellowCards++;
      if (fact.type === 'RED_CARD') row.redCards++;
      return clubs;
    }, {}));
  }

  aggregateMatch(facts:VerifiedFact[]){
    const teams=['home','away'] as const;const result:Record<string,any>={};const possession=Object.fromEntries(teams.map(team=>[team,0])) as Record<string,number>;
    for(const team of teams){const selected=facts.filter(f=>f.teamId===team);const freeKicks=selected.filter(f=>f.type==='FREE_KICK');result[team]={goals:selected.filter(f=>f.type==='GOAL').length,shots:selected.filter(f=>f.type==='SHOT').length,touches:selected.filter(f=>f.type==='TOUCH').length,corners:selected.filter(f=>f.type==='CORNER').length,foulsCommitted:selected.filter(f=>f.type==='FOUL').length,freeKicks:freeKicks.length,averageFreeKickDistance:freeKicks.length?this.round(freeKicks.reduce((n,f)=>n+Number(f.payload?.distanceMeters??0),0)/freeKicks.length,1):0,penalties:{total:selected.filter(f=>f.type==='PENALTY').length,scored:selected.filter(f=>f.type==='PENALTY'&&f.payload?.outcome==='SCORED').length},yellowCards:selected.filter(f=>f.type==='YELLOW_CARD').length,redCards:selected.filter(f=>f.type==='RED_CARD').length,goalMethods:selected.filter(f=>f.type==='GOAL').reduce<Record<string,number>>((all,f)=>{const method=String(f.payload?.scoringMethod??'OTHER');all[method]=(all[method]??0)+1;return all},{}),fouledPlayers:selected.filter(f=>f.type==='FOUL').map(f=>f.payload?.fouledPlayerId).filter(Boolean)};possession[team]=selected.filter(f=>f.type==='POSSESSION_INTERVAL').reduce((n,f)=>n+Number(f.payload?.durationSeconds??0),0)}
    const total=possession.home+possession.away;result.home.possessionPercentage=total?this.round(possession.home/total*100,1):0;result.away.possessionPercentage=total?this.round(possession.away/total*100,1):0;return {teams:result,possessionDurationSeconds:possession,verifiedFacts:facts.length};
  }
  private round(value:number,places:number){const factor=10**places;return Math.round((value+Number.EPSILON)*factor)/factor}
}
