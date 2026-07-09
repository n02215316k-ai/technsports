import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SubmissionStatus, TransferType } from '@prisma/client';
import { PrismaService } from './prisma.service';

export type TransferContributionInput={clientEventId:string;playerId:string;fromTeamId?:string;toTeamId:string;type:'PERMANENT'|'LOAN'|'LOAN_RETURN'|'FREE_AGENT'|'RELEASED';effectiveAt:string;feeAmount?:number;feeCurrency?:string;sourceUrl:string};

@Injectable()
export class TransferContributionService {
  constructor(private readonly db:PrismaService){}
  async submit(contributorId:string,input:TransferContributionInput){
    if(input.fromTeamId===input.toTeamId)throw new BadRequestException('Origin and destination clubs must be different');
    const effectiveAt=new Date(input.effectiveAt);
    const [player,toTeam,fromTeam]=await Promise.all([this.db.player.findUnique({where:{id:input.playerId}}),this.db.team.findUnique({where:{id:input.toTeamId}}),input.fromTeamId?this.db.team.findUnique({where:{id:input.fromTeamId}}):null]);
    if(!player)throw new NotFoundException('Player not found');if(!toTeam)throw new NotFoundException('Destination club not found');if(input.fromTeamId&&!fromTeam)throw new NotFoundException('Origin club not found');
    const duplicate=await this.db.transferContribution.findUnique({where:{contributorId_clientEventId:{contributorId,clientEventId:input.clientEventId}}});if(duplicate)return{...this.serialize(duplicate),idempotent:true};
    const start=new Date(effectiveAt);start.setUTCHours(0,0,0,0);const end=new Date(start.getTime()+86400000);
    const peer=await this.db.transferContribution.findFirst({where:{contributorId:{not:contributorId},playerId:input.playerId,fromTeamId:input.fromTeamId??null,toTeamId:input.toTeamId,type:input.type as TransferType,effectiveAt:{gte:start,lt:end},feeMinor:input.feeAmount!==undefined?BigInt(Math.round(input.feeAmount*100)):null,feeCurrency:input.feeCurrency??null}});
    const status=peer?SubmissionStatus.CONSENSUS:SubmissionStatus.PENDING;
    const created=await this.db.$transaction(async tx=>{if(peer)await tx.transferContribution.update({where:{id:peer.id},data:{status:SubmissionStatus.CONSENSUS}});return tx.transferContribution.create({data:{contributorId,clientEventId:input.clientEventId,playerId:input.playerId,fromTeamId:input.fromTeamId,toTeamId:input.toTeamId,type:input.type as TransferType,effectiveAt,feeMinor:input.feeAmount!==undefined?BigInt(Math.round(input.feeAmount*100)):null,feeCurrency:input.feeCurrency,sourceUrl:input.sourceUrl,status}})});
    const confidence=peer?(peer.status===SubmissionStatus.CONSENSUS ? 0.95 : 0.75):0.55;
    return{...this.serialize(created),confidence,agreeingSources:peer?2:1,idempotent:false};
  }
  async list(){return (await this.db.transferContribution.findMany({orderBy:{receivedAt:'desc'},take:100})).map(item=>this.serialize(item))}
  private serialize(item:any){return{...item,feeMinor:item.feeMinor?.toString()}}
}
