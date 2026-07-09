import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { TransferContributionService } from './transfer-contribution.service';
import { RequireRoles, RoleGuard } from './auth.controller';
class TransferContributionDto{@IsOptional() @IsString() contributorId?:string;@IsString() clientEventId!:string;@IsString() playerId!:string;@IsOptional() @IsString() fromTeamId?:string;@IsString() toTeamId!:string;@IsIn(['PERMANENT','LOAN','LOAN_RETURN','FREE_AGENT','RELEASED']) type!:'PERMANENT'|'LOAN'|'LOAN_RETURN'|'FREE_AGENT'|'RELEASED';@IsDateString() effectiveAt!:string;@IsOptional() @IsNumber() @Min(0) feeAmount?:number;@IsOptional() @IsString() feeCurrency?:string;@IsUrl() sourceUrl!:string}
@Controller('transfers/contributions')
export class TransferContributionController {constructor(private readonly transfers:TransferContributionService){}@Post() @UseGuards(RoleGuard) @RequireRoles('COLLECTOR','REVIEWER','EDITOR','ADMIN') submit(@Body() dto:TransferContributionDto,@Req() request:any){return this.transfers.submit(request.user.id,dto)}@Get() list(){return this.transfers.list()}}
