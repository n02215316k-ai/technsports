import { BadRequestException, Body, CanActivate, Controller, ExecutionContext, Get, Injectable, Param, Post, Query, Req, UnauthorizedException, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsArray, IsDateString, IsHexColor, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUrl, Length, Matches, Max, MaxLength, Min } from 'class-validator';
import { AdministrationService } from './administration.service';
import { AppRole, AuthService } from './auth.service';
import { AssetService } from './asset.service';

class CompetitionDto{@IsString() @Length(2,100) name!:string;@IsString() @Matches(/^[A-Za-z]{2}$/) countryCode!:string}
class SeasonDto{@IsString() @Length(2,30) label!:string;@IsDateString() startsAt!:string;@IsDateString() endsAt!:string}
class TeamDto{@IsString() @Length(2,100) name!:string;@IsString() @Length(2,8) shortName!:string;@IsOptional() @IsUrl({require_tld:false}) crestUrl?:string;@IsOptional() @IsString() @Length(2,80) city?:string;@IsOptional() @IsInt() @Min(1850) @Max(2100) foundedYear?:number;@IsOptional() @IsUrl() websiteUrl?:string;@IsOptional() @IsHexColor() primaryColor?:string;@IsOptional() @IsHexColor() secondaryColor?:string}
class RegistrationDto{@IsString() teamId!:string}
class RoleDto{@IsIn(['SUPPORTER','COLLECTOR','REVIEWER','EDITOR','ADMIN']) role!:AppRole}
class FixtureDto{@IsString() seasonId!:string;@IsString() homeTeamId!:string;@IsString() awayTeamId!:string;@IsDateString() kickoffAt!:string;@IsOptional() @IsString() round?:string;@IsOptional() @IsString() venueName?:string;@IsOptional() @IsString() venueId?:string}
class ArticleDto{@IsString() @Length(5,180) title!:string;@IsString() @Length(20,400) excerpt!:string;@IsString() @Length(50,50000) body!:string;@IsString() @Length(2,40) category!:string;@IsIn(['DRAFT','PUBLISHED']) status!:'DRAFT'|'PUBLISHED';@IsOptional() @IsString() @MaxLength(100) authorName?:string;@IsOptional() @IsUrl() coverImageUrl?:string;@IsOptional() @IsArray() @IsString({each:true}) relatedPlayerIds?:string[]}
class VenueDto{@IsString() @Length(2,120) name!:string;@IsString() @Length(2,80) city!:string;@IsOptional() @IsString() @Matches(/^[A-Za-z]{2}$/) countryCode?:string;@IsOptional() @IsNumber() latitude?:number;@IsOptional() @IsNumber() longitude?:number}
class PlayerDto{@IsString() @Length(2,120) legalName!:string;@IsOptional() @IsString() @Length(2,80) knownAs?:string;@IsOptional() @IsDateString() dateOfBirth?:string;@IsOptional() @IsString() @Matches(/^[A-Za-z]{2}$/) nationalityCode?:string;@IsOptional() @IsString() @Length(2,30) preferredFoot?:string;@IsOptional() @IsUrl({require_tld:false}) photoUrl?:string;@IsString() @Length(2,40) position!:string}
class PlayerRegistrationDto{@IsString() playerId!:string;@IsString() teamId!:string;@IsString() seasonId!:string;@IsOptional() @IsInt() @Min(1) @Max(99) shirtNumber?:number;@IsDateString() startsAt!:string;@IsOptional() @IsDateString() endsAt?:string}
class FixtureUpdateDto{@IsOptional() @IsDateString() kickoffAt?:string;@IsOptional() @IsString() round?:string;@IsOptional() @IsString() venueName?:string;@IsOptional() @IsString() venueId?:string;@IsOptional() @IsIn(['SCHEDULED','LIVE','SUSPENDED','POSTPONED','ABANDONED','FINISHED']) status?:'SCHEDULED'|'LIVE'|'SUSPENDED'|'POSTPONED'|'ABANDONED'|'FINISHED';@IsOptional() @IsInt() @Min(0) homeScore?:number;@IsOptional() @IsInt() @Min(0) awayScore?:number}
class LineupDto{@IsString() teamId!:string;@IsArray() @IsString({each:true}) playerIds!:string[]}
class AssignmentDto{@IsString() matchId!:string;@IsString() userId!:string;@IsIn(['LINEUPS','TIMELINE','PLAYER_ACTIONS','TEAM_STATS','MEDIA']) scope!:'LINEUPS'|'TIMELINE'|'PLAYER_ACTIONS'|'TEAM_STATS'|'MEDIA'}
class ResolveIdentityDto{@IsString() playerId!:string}
class RejectDto{@IsOptional() @IsString() reason?:string}
class AutoApproveDto{@IsIn([true,false]) enabled!:boolean}

@Injectable()
export class AdminKeyGuard implements CanActivate {
  constructor(private readonly auth:AuthService){}
  async canActivate(context:ExecutionContext){
    const request=context.switchToHttp().getRequest();
    const user=await this.auth.fromRequest(request);
    const editorial=/\/admin\/(articles|uploads\/cover)(?:\/|$)/.test(request.originalUrl??request.url??'');
    const review=/\/admin\/review(?:\/|$)/.test(request.originalUrl??request.url??'');
    if(user)request.user=user;
    if(user?.role==='ADMIN'||(editorial&&user?.role==='EDITOR'))return true;
    if(review&&(user?.role==='REVIEWER'||user?.role==='EDITOR'))return true;
    const expected=process.env.ADMIN_API_KEY;
    const supplied=request.headers['x-admin-key'];
    if(expected&&supplied===expected)return true;
    throw new UnauthorizedException('Administrator or editor access is required');
  }
}

@Controller('admin') @UseGuards(AdminKeyGuard)
export class AdministrationController {
  constructor(private readonly admin:AdministrationService,private readonly auth:AuthService,private readonly assets:AssetService){}
  private publicUrl(request:any,path:string){const proto=String(request.get('x-forwarded-proto')??request.protocol).split(',')[0];const host=String(request.get('x-forwarded-host')??request.get('host'));return `${proto}://${host}${path}`}
  @Get('users') users(){return this.auth.users()}
  @Post('users/:id/role') role(@Param('id') id:string,@Body() dto:RoleDto){return this.auth.assignRole(id,dto.role)}
  @Post('competitions') competition(@Body() dto:CompetitionDto){return this.admin.createCompetition(dto)}
  @Post('competitions/:id/seasons') season(@Param('id') id:string,@Body() dto:SeasonDto){return this.admin.createSeason(id,dto)}
  @Post('venues') venue(@Body() dto:VenueDto){return this.admin.createVenue(dto)}
  @Post('teams') team(@Body() dto:TeamDto){return this.admin.createTeam(dto)}
  @Post('players') player(@Body() dto:PlayerDto){return this.admin.createPlayer(dto)}
  @Post('players/registrations') playerRegistration(@Body() dto:PlayerRegistrationDto){return this.admin.registerPlayer(dto)}
  @Post('seasons/:id/teams') register(@Param('id') id:string,@Body() dto:RegistrationDto){return this.admin.registerTeam(id,dto.teamId)}
  @Post('fixtures') fixture(@Body() dto:FixtureDto){return this.admin.createFixture(dto)}
  @Post('fixtures/:id') updateFixture(@Param('id') id:string,@Body() dto:FixtureUpdateDto){return this.admin.updateFixture(id,dto)}
  @Post('fixtures/:id/lineups') lineup(@Param('id') id:string,@Body() dto:LineupDto){return this.admin.setLineup(id,dto)}
  @Post('assignments') assignment(@Body() dto:AssignmentDto){return this.admin.assignCollector(dto)}
  @Post('articles') article(@Body() dto:ArticleDto){return this.admin.createArticle(dto)}
  @Get('review') review(){return this.admin.reviewQueue()}
  @Post('review/observations/:id/approve') approveObservation(@Param('id') id:string){return this.admin.approveObservation(id)}
  @Post('review/observations/:id/reject') rejectObservation(@Param('id') id:string,@Body() dto:RejectDto){return this.admin.rejectObservation(id,dto.reason)}
  @Post('review/transfers/:id/approve') approveTransfer(@Param('id') id:string){return this.admin.approveTransfer(id)}
  @Post('review/transfers/:id/reject') rejectTransfer(@Param('id') id:string,@Body() dto:RejectDto){return this.admin.rejectTransfer(id,dto.reason)}
  @Post('review/identity-claims/:id/resolve') resolveIdentity(@Param('id') id:string,@Body() dto:ResolveIdentityDto){return this.admin.resolveIdentityClaim(id,dto.playerId)}
  @Post('review/identity-claims/:id/reject') rejectIdentity(@Param('id') id:string,@Body() dto:RejectDto){return this.admin.rejectIdentityClaim(id,dto.reason)}
  @Post('review/articles/:id/approve') approveArticle(@Param('id') id:string,@Req() request:any){return this.admin.approveArticle(id,request.user?.id)}
  @Post('review/articles/:id/reject') rejectArticle(@Param('id') id:string,@Body() dto:RejectDto){return this.admin.rejectArticle(id,dto.reason)}
  @Post('review/articles/:id/delete') deleteArticle(@Param('id') id:string,@Body() dto:RejectDto){return this.admin.deleteArticle(id,dto.reason)}
  @Post('review/articles/auto-approve') setArticleAutoApprove(@Body() dto:AutoApproveDto){return this.admin.setContributorArticleAutoApprove(dto.enabled)}
  @Post('uploads/cover') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:5*1024*1024}}))
  uploadCover(@UploadedFile() file:any,@Req() request:any){const saved=this.assets.saveImage(file,'covers');return {...saved,url:this.publicUrl(request,saved.path)}}
  @Post('uploads/team-logo') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:5*1024*1024}}))
  uploadTeamLogo(@UploadedFile() file:any,@Req() request:any){const saved=this.assets.saveImage(file,'team-logos');return {...saved,url:this.publicUrl(request,saved.path)}}
  @Post('uploads/player-face') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:5*1024*1024}}))
  uploadPlayerFace(@UploadedFile() file:any,@Req() request:any){const saved=this.assets.saveImage(file,'player-faces');return {...saved,url:this.publicUrl(request,saved.path)}}
}

@Controller('catalog')
export class CatalogController {
  constructor(private readonly admin:AdministrationService){}
  @Get('competitions') competitions(){return this.admin.listCompetitions()}
  @Get('venues') venues(){return this.admin.listVenues()}
  @Get('teams') teams(){return this.admin.listTeams()}
  @Get('players') players(@Query('q') q?:string){return this.admin.listPlayers(q)}
  @Get('seasons/:id/teams') seasonTeams(@Param('id') id:string){return this.admin.seasonTeams(id)}
  @Get('fixtures') fixtures(@Query('seasonId') seasonId:string){return this.admin.fixtures(seasonId)}
  @Get('articles') articles(){return this.admin.articles()}
  @Get('articles/:slug') article(@Param('slug') slug:string){return this.admin.article(slug)}
}
