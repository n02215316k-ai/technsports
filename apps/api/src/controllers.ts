import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { MatchStatus, Prisma, SubmissionStatus } from '@prisma/client';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Length, Min } from 'class-validator';
import { ConsensusService, Observation as ConsensusObservation } from './consensus.service';
import { PrismaService } from './prisma.service';
import { IdentityService } from './identity.service';
import { EventValidationService } from './event-validation.service';
import { RequireRoles, RoleGuard } from './auth.controller';

class SubmitObservationDto {@IsOptional() @IsString() contributorId?:string;@IsString() eventType!:string;@IsInt() @Min(0) matchSecond!:number;@IsOptional() @IsString() playerId?:string;@IsOptional() @IsString() unlistedPlayerName?:string;@IsOptional() @IsString() teamId?:string;@IsObject() payload!:Record<string,unknown>;@IsString() clientEventId!:string}
class ContributorArticleDto{@IsString() matchId!:string;@IsString() @Length(5,180) title!:string;@IsString() @Length(20,400) excerpt!:string;@IsString() @Length(50,50000) body!:string;@IsOptional() @IsString() coverImageUrl?:string}
class ArticleReactionDto{@IsIn([1,-1]) value!:1|-1}
class ArticleCommentDto{@IsString() @Length(2,1200) body!:string}

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
  async submit(@Param('matchId')matchId:string,@Body()dto:SubmitObservationDto,@Req()request:any){const contributorId=request.user.id;const duplicate=await this.db.observation.findUnique({where:{contributorId_clientEventId:{contributorId,clientEventId:dto.clientEventId}}});if(duplicate)return{matchId,collectorId:contributorId,observationId:duplicate.id,status:'DUPLICATE',idempotent:true};const payload=this.events.validate(dto.eventType,dto.payload);const requiresPlayer=this.events.requiresPlayer(dto.eventType);const identity=requiresPlayer?await this.identities.resolve({matchId,playerId:dto.playerId,unlistedPlayerName:dto.unlistedPlayerName,teamId:dto.teamId}):{subjectId:payload.team?`team:${String(payload.team)}`:`match:${dto.eventType}`,playerId:undefined,identityStatus:'TEAM_EVENT' as const,identityClaim:undefined};const peers=await this.db.observation.findMany({where:{matchId,eventType:dto.eventType,subjectId:identity.subjectId,matchSecond:{gte:Math.max(0,dto.matchSecond-10),lte:dto.matchSecond+10}}});const observation:ConsensusObservation={eventType:dto.eventType,matchSecond:dto.matchSecond,payload,contributorId,clientEventId:dto.clientEventId,matchId,subjectId:identity.subjectId};const score=this.consensus.score(observation,peers.map(item=>({eventType:item.eventType,matchSecond:item.matchSecond,payload:item.payload as Record<string,unknown>,contributorId:item.contributorId,clientEventId:item.clientEventId,matchId:item.matchId,subjectId:item.subjectId??undefined})));const status=score.publishable?SubmissionStatus.CONSENSUS:score.conflictingSources?SubmissionStatus.CONFLICT:SubmissionStatus.PENDING;const saved=await this.db.$transaction(async tx=>{const created=await tx.observation.create({data:{matchId,contributorId,eventType:dto.eventType,subjectId:identity.subjectId,playerId:identity.playerId,identityClaimId:identity.identityClaim?.id,matchSecond:dto.matchSecond,payload:payload as Prisma.InputJsonValue,clientEventId:dto.clientEventId,clientRecordedAt:new Date(),status}});let factId:string|undefined;if(score.publishable){const fact=await tx.matchFact.create({data:{matchId,factType:dto.eventType,subjectId:identity.subjectId,matchSecond:dto.matchSecond,value:payload as Prisma.InputJsonValue,confidence:score.confidence,sourceCount:score.agreeingSources,publishedAt:new Date()}});factId=fact.id}return{created,factId}});return{matchId,collectorId:contributorId,observationId:saved.created.id,factId:saved.factId,status,idempotent:false,playerId:identity.playerId,subjectId:identity.subjectId,identityStatus:identity.identityStatus,...score}}
}

@Controller('contributor')
@UseGuards(RoleGuard)
@RequireRoles('COLLECTOR','REVIEWER','EDITOR','ADMIN')
export class ContributorWorkspaceController {
  constructor(private readonly db:PrismaService){}
  @Get('assignments')
  async assignments(@Req() request:any){
    const userId=request.user.id;
    const assignments=await this.db.assignment.findMany({where:{userId},include:{match:{include:{homeTeam:true,awayTeam:true,venue:true,season:{include:{competition:true}},_count:{select:{observations:true}}}}},orderBy:{match:{kickoffAt:'asc'}},take:100});
    return assignments.map(item=>({...item,observations:item.match._count.observations}));
  }
  @Get('matches')
  async matches(@Query('seasonId')seasonId?:string){
    const matches=await this.db.match.findMany({
      where:{seasonId,status:{in:[MatchStatus.SCHEDULED,MatchStatus.LIVE,MatchStatus.SUSPENDED]}},
      include:{
        homeTeam:true,
        awayTeam:true,
        venue:true,
        season:{include:{competition:true}},
        assignments:{include:{user:{select:{id:true,username:true,displayName:true,role:true}}}}
      },
      orderBy:{kickoffAt:'asc'},
      take:120
    });
    return matches;
  }
  @Get('article-matches')
  async articleMatches(@Req() request:any){
    const userId=request.user.id;
    return this.db.match.findMany({where:{OR:[{assignments:{some:{userId}}},{observations:{some:{contributorId:userId}}}]},include:{homeTeam:true,awayTeam:true,venue:true,season:{include:{competition:true}},_count:{select:{observations:{where:{contributorId:userId}},articles:{where:{authorUserId:userId,deletedAt:null}}}}},orderBy:{kickoffAt:'desc'},take:100});
  }
  @Post('articles')
  async createArticle(@Req() request:any,@Body() dto:ContributorArticleDto){
    const user=request.user;
    const eligible=await this.db.match.findFirst({where:{id:dto.matchId,OR:[{assignments:{some:{userId:user.id}}},{observations:{some:{contributorId:user.id}}}]},include:{homeTeam:true,awayTeam:true,season:{include:{competition:true}}}});
    if(!eligible)throw new BadRequestException('You can only write match analysis for matches you were assigned to or contributed data to');
    const setting=await this.db.siteSetting.findUnique({where:{key:'contributorArticleAutoApprove'}});
    const auto=Boolean((setting?.value as any)?.enabled);
    const slug=await this.uniqueSlug(`${dto.title}-${eligible.homeTeam.name}-${eligible.awayTeam.name}`);
    return this.db.article.create({data:{slug,title:dto.title.trim(),excerpt:dto.excerpt.trim(),body:{format:'plain_text',text:dto.body.trim()},category:'MATCH ANALYSIS',status:auto?'PUBLISHED':'PENDING',source:'CONTRIBUTOR',autoApproved:auto,publishedAt:auto?new Date():null,approvedAt:auto?new Date():null,authorName:user.displayName,authorUserId:user.id,matchId:dto.matchId,coverImageUrl:dto.coverImageUrl?.trim()||undefined},include:{match:{include:{homeTeam:true,awayTeam:true}},authorUser:{select:{id:true,username:true,displayName:true}}}});
  }
  private slug(value:string){return value.toLowerCase().trim().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,120)||`analysis-${Date.now()}`}
  private async uniqueSlug(value:string){const base=this.slug(value);let slug=base,index=2;while(await this.db.article.findUnique({where:{slug}})){slug=`${base}-${index++}`}return slug}
}

@Controller('articles')
export class ArticleInteractionController {
  constructor(private readonly db:PrismaService){}
  @Get(':slug/discussion')
  async discussion(@Param('slug') slug:string){
    const article=await this.db.article.findFirst({where:{slug,status:'PUBLISHED',deletedAt:null},select:{id:true}});
    if(!article)return{likes:0,dislikes:0,comments:[]};
    const [likes,dislikes,comments]=await Promise.all([
      this.db.articleReaction.count({where:{articleId:article.id,value:1}}),
      this.db.articleReaction.count({where:{articleId:article.id,value:-1}}),
      this.db.articleComment.findMany({where:{articleId:article.id,status:'PUBLISHED'},include:{user:{select:{username:true,displayName:true,role:true}}},orderBy:{createdAt:'desc'},take:50})
    ]);
    return{likes,dislikes,comments};
  }
  @Post(':slug/reactions') @UseGuards(RoleGuard) @RequireRoles('SUPPORTER','COLLECTOR','REVIEWER','EDITOR','ADMIN')
  async react(@Param('slug') slug:string,@Body() dto:ArticleReactionDto,@Req() request:any){
    const article=await this.db.article.findFirst({where:{slug,status:'PUBLISHED',deletedAt:null}});
    if(!article)throw new BadRequestException('Published article not found');
    await this.db.articleReaction.upsert({where:{articleId_userId:{articleId:article.id,userId:request.user.id}},update:{value:dto.value},create:{articleId:article.id,userId:request.user.id,value:dto.value}});
    return this.discussion(slug);
  }
  @Post(':slug/comments') @UseGuards(RoleGuard) @RequireRoles('SUPPORTER','COLLECTOR','REVIEWER','EDITOR','ADMIN')
  async comment(@Param('slug') slug:string,@Body() dto:ArticleCommentDto,@Req() request:any){
    const article=await this.db.article.findFirst({where:{slug,status:'PUBLISHED',deletedAt:null}});
    if(!article)throw new BadRequestException('Published article not found');
    await this.db.articleComment.create({data:{articleId:article.id,userId:request.user.id,body:dto.body.trim()}});
    return this.discussion(slug);
  }
}

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly db:PrismaService){}
  @Get('clubs/:teamId')async club(@Param('teamId')teamId:string,@Query('seasonId')seasonId?:string,@Query('venueId')venueId?:string,@Query('location')location?:'HOME'|'AWAY'){const matches=await this.db.match.findMany({where:{seasonId,venueId,status:'FINISHED',...(location==='HOME'?{homeTeamId:teamId}:location==='AWAY'?{awayTeamId:teamId}:{OR:[{homeTeamId:teamId},{awayTeamId:teamId}]})}});let wins=0,draws=0,losses=0,goals=0,conceded=0,cleanSheets=0;for(const match of matches){const home=match.homeTeamId===teamId;const gf=home?match.homeScore:match.awayScore,ga=home?match.awayScore:match.homeScore;goals+=gf;conceded+=ga;if(gf>ga)wins++;else if(gf===ga)draws++;else losses++;if(ga===0)cleanSheets++}return{teamId,seasonId:seasonId??null,venueId:venueId??null,location:location??'ALL',matches:matches.length,wins,draws,losses,goals,conceded,cleanSheets,points:wins*3+draws,source:'database-finished-matches'}}
  @Get('players/:playerId/by-club')async player(@Param('playerId')playerId:string){const [registrations,participants,facts]=await Promise.all([this.db.playerRegistration.findMany({where:{playerId},include:{team:true}}),this.db.matchParticipant.findMany({where:{playerId},include:{match:true}}),this.db.matchFact.findMany({where:{subjectId:playerId,publishedAt:{not:null}},include:{match:true}})]);return registrations.map(registration=>{const appearances=new Set(participants.filter(item=>item.teamId===registration.teamId&&item.match.seasonId===registration.seasonId).map(item=>item.matchId));const events=facts.filter(item=>item.match.seasonId===registration.seasonId&&(item.match.homeTeamId===registration.teamId||item.match.awayTeamId===registration.teamId));return{team:registration.team,seasonId:registration.seasonId,appearances:appearances.size,goals:events.filter(event=>event.factType==='GOAL').length,assists:events.filter(event=>event.factType==='ASSIST').length}})}
  @Get('matches/:matchId')async match(@Param('matchId')matchId:string){const facts=await this.db.matchFact.findMany({where:{matchId},orderBy:{matchSecond:'asc'}});return{matchId,facts}}
}
