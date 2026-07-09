import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Prisma, SubmissionStatus } from '@prisma/client';
import { IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { ConsensusService, Observation as ConsensusObservation } from './consensus.service';
import { PrismaService } from './prisma.service';
import { IdentityService } from './identity.service';
import { EventValidationService } from './event-validation.service';
import { RequireRoles, RoleGuard } from './auth.controller';

class SubmitObservationDto {@IsOptional() @IsString() contributorId?:string;@IsString() eventType!:string;@IsInt() @Min(0) matchSecond!:number;@IsOptional() @IsString() playerId?:string;@IsOptional() @IsString() unlistedPlayerName?:string;@IsOptional() @IsString() teamId?:string;@IsObject() payload!:Record<string,unknown>;@IsString() clientEventId!:string}

@Controller('health')
export class HealthController {constructor(private readonly db:PrismaService){}@Get()async check(){await this.db.$queryRaw`SELECT 1`;return{status:'ok',service:'technsports-api',database:'connected',timestamp:new Date().toISOString()}}}

@Controller('matches')
export class MatchesController {
  constructor(private readonly identities:IdentityService,private readonly events:EventValidationService,private readonly db:PrismaService){}
  @Get(':id')async get(@Param('id')id:string){return this.db.match.findUnique({where:{id},include:{homeTeam:true,awayTeam:true,venue:true,season:{include:{competition:true}}}})}
  @Get(':id/participants')async participants(@Param('id')id:string,@Query('teamId')teamId?:string){const participants=await this.identities.participants(id,teamId);return{matchId:id,lineupConfirmed:participants.some(item=>item.source==='CONFIRMED_LINEUP'),fallbackSource:'SEASON_REGISTRATION',participants}}
  @Get(':id/event-types')eventTypes(){return this.events.catalogue()}
}

@Controller('matches/:matchId/observations')
export class ContributionsController {
  constructor(private readonly consensus:ConsensusService,private readonly identities:IdentityService,private readonly events:EventValidationService,private readonly db:PrismaService){}
  @Post() @UseGuards(RoleGuard) @RequireRoles('COLLECTOR','REVIEWER','EDITOR','ADMIN')
  async submit(@Param('matchId')matchId:string,@Body()dto:SubmitObservationDto,@Req()request:any){const contributorId=request.user.id;const duplicate=await this.db.observation.findUnique({where:{contributorId_clientEventId:{contributorId,clientEventId:dto.clientEventId}}});if(duplicate)return{matchId,collectorId:contributorId,observationId:duplicate.id,status:'DUPLICATE',idempotent:true};const payload=this.events.validate(dto.eventType,dto.payload);const requiresPlayer=this.events.requiresPlayer(dto.eventType);const identity=requiresPlayer?await this.identities.resolve({matchId,playerId:dto.playerId,unlistedPlayerName:dto.unlistedPlayerName,teamId:dto.teamId}):{subjectId:`team:${String(payload.team)}`,playerId:undefined,identityStatus:'TEAM_EVENT' as const,identityClaim:undefined};const peers=await this.db.observation.findMany({where:{matchId,eventType:dto.eventType,subjectId:identity.subjectId,matchSecond:{gte:Math.max(0,dto.matchSecond-10),lte:dto.matchSecond+10}}});const observation:ConsensusObservation={eventType:dto.eventType,matchSecond:dto.matchSecond,payload,contributorId,clientEventId:dto.clientEventId,matchId,subjectId:identity.subjectId};const score=this.consensus.score(observation,peers.map(item=>({eventType:item.eventType,matchSecond:item.matchSecond,payload:item.payload as Record<string,unknown>,contributorId:item.contributorId,clientEventId:item.clientEventId,matchId:item.matchId,subjectId:item.subjectId??undefined})));const status=score.publishable?SubmissionStatus.CONSENSUS:score.conflictingSources?SubmissionStatus.CONFLICT:SubmissionStatus.PENDING;const saved=await this.db.$transaction(async tx=>{const created=await tx.observation.create({data:{matchId,contributorId,eventType:dto.eventType,subjectId:identity.subjectId,playerId:identity.playerId,identityClaimId:identity.identityClaim?.id,matchSecond:dto.matchSecond,payload:payload as Prisma.InputJsonValue,clientEventId:dto.clientEventId,clientRecordedAt:new Date(),status}});let factId:string|undefined;if(score.publishable){const fact=await tx.matchFact.create({data:{matchId,factType:dto.eventType,subjectId:identity.subjectId,matchSecond:dto.matchSecond,value:payload as Prisma.InputJsonValue,confidence:score.confidence,sourceCount:score.agreeingSources,publishedAt:new Date()}});factId=fact.id}return{created,factId}});return{matchId,collectorId:contributorId,observationId:saved.created.id,factId:saved.factId,status,idempotent:false,playerId:identity.playerId,subjectId:identity.subjectId,identityStatus:identity.identityStatus,...score}}
}

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly db:PrismaService){}
  @Get('clubs/:teamId')async club(@Param('teamId')teamId:string,@Query('seasonId')seasonId?:string,@Query('venueId')venueId?:string,@Query('location')location?:'HOME'|'AWAY'){const matches=await this.db.match.findMany({where:{seasonId,venueId,status:'FINISHED',...(location==='HOME'?{homeTeamId:teamId}:location==='AWAY'?{awayTeamId:teamId}:{OR:[{homeTeamId:teamId},{awayTeamId:teamId}]})}});let wins=0,draws=0,losses=0,goals=0,conceded=0,cleanSheets=0;for(const match of matches){const home=match.homeTeamId===teamId;const gf=home?match.homeScore:match.awayScore,ga=home?match.awayScore:match.homeScore;goals+=gf;conceded+=ga;if(gf>ga)wins++;else if(gf===ga)draws++;else losses++;if(ga===0)cleanSheets++}return{teamId,seasonId:seasonId??null,venueId:venueId??null,location:location??'ALL',matches:matches.length,wins,draws,losses,goals,conceded,cleanSheets,points:wins*3+draws,source:'database-finished-matches'}}
  @Get('players/:playerId/by-club')async player(@Param('playerId')playerId:string){const [registrations,participants,facts]=await Promise.all([this.db.playerRegistration.findMany({where:{playerId},include:{team:true}}),this.db.matchParticipant.findMany({where:{playerId},include:{match:true}}),this.db.matchFact.findMany({where:{subjectId:playerId,publishedAt:{not:null}},include:{match:true}})]);return registrations.map(registration=>{const appearances=new Set(participants.filter(item=>item.teamId===registration.teamId&&item.match.seasonId===registration.seasonId).map(item=>item.matchId));const events=facts.filter(item=>item.match.seasonId===registration.seasonId&&(item.match.homeTeamId===registration.teamId||item.match.awayTeamId===registration.teamId));return{team:registration.team,seasonId:registration.seasonId,appearances:appearances.size,goals:events.filter(event=>event.factType==='GOAL').length,assists:events.filter(event=>event.factType==='ASSIST').length}})}
  @Get('matches/:matchId')async match(@Param('matchId')matchId:string){const facts=await this.db.matchFact.findMany({where:{matchId},orderBy:{matchSecond:'asc'}});return{matchId,facts}}
}
