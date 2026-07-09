import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublicDataService } from './public-data.service';
@Controller('public')
export class PublicDataController {
  constructor(private readonly data:PublicDataService){}
  @Get('overview')overview(@Query('seasonId')seasonId?:string){return this.data.overview(seasonId)}
  @Get('competitions')competitions(){return this.data.competitions()}
  @Get('matches')matches(@Query('seasonId')seasonId?:string,@Query('date')date?:string,@Query('teamId')teamId?:string,@Query('limit')limit?:string){return this.data.matches({seasonId,date,teamId,limit:limit?Number(limit):undefined})}
  @Get('matches/:id')match(@Param('id')id:string){return this.data.match(id)}
  @Get('standings/:seasonId')standings(@Param('seasonId')seasonId:string){return this.data.standings(seasonId)}
  @Get('players')players(@Query('seasonId')seasonId?:string){return this.data.players(seasonId)}
  @Get('players/:slug')player(@Param('slug')slug:string){return this.data.player(slug)}
  @Get('teams/:slug')team(@Param('slug')slug:string){return this.data.team(slug)}
  @Get('transfers')transfers(){return this.data.transfers()}
  @Get('articles')articles(){return this.data.articles()}
  @Get('contributors')contributors(){return this.data.contributors()}
  @Get('contributors/:id')contributor(@Param('id')id:string){return this.data.contributor(id)}
  @Get('search')search(@Query('q')q=''){return this.data.search(q)}
}
