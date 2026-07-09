import { Injectable } from '@nestjs/common';

export type Observation = { matchId: string; eventType: string; matchSecond: number; subjectId?: string; payload: Record<string, unknown>; contributorId: string; clientEventId: string };

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string,unknown>).sort(([a],[b]) => a.localeCompare(b)).map(([key,item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
  return JSON.stringify(value);
}
const tolerances:Record<string,number>={distanceMeters:2,durationSeconds:3,x:5,y:5};
function equivalentPayload(a:Record<string,unknown>,b:Record<string,unknown>){const keys=[...new Set([...Object.keys(a),...Object.keys(b)])];return keys.every(key=>{const av=a[key],bv=b[key];if(typeof av==='number'&&typeof bv==='number'&&tolerances[key]!==undefined)return Math.abs(av-bv)<=tolerances[key];return stable(av)===stable(bv)})}

@Injectable()
export class ConsensusService {
  score(candidate: Observation, peers: Observation[]) {
    const comparable = peers.filter(p => p.matchId === candidate.matchId && p.contributorId !== candidate.contributorId && p.eventType === candidate.eventType && p.subjectId === candidate.subjectId && Math.abs(p.matchSecond - candidate.matchSecond) <= 10);
    const matches = comparable.filter(p => equivalentPayload(p.payload,candidate.payload));
    const conflicts = comparable.filter(p => !equivalentPayload(p.payload,candidate.payload));
    const confidence = Math.min(0.99, 0.55 + matches.length * 0.2);
    return { confidence, agreeingSources: matches.length + 1, conflictingSources: conflicts.length, publishable: matches.length >= 1 && conflicts.length === 0, reviewRequired: matches.length === 0 || conflicts.length > 0 };
  }
}
