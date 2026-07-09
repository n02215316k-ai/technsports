import { BadRequestException, Injectable } from '@nestjs/common';
type Rule={requiresPlayer:boolean;description:string};
const rules:Record<string,Rule>={GOAL:{requiresPlayer:true,description:'Goal with scoring method and distance'},SHOT:{requiresPlayer:true,description:'Attempt on goal'},TOUCH:{requiresPlayer:true,description:'Player ball touch'},FREE_KICK:{requiresPlayer:false,description:'Free kick and distance'},CORNER:{requiresPlayer:false,description:'Corner kick'},FOUL:{requiresPlayer:true,description:'Foul committed and player fouled'},PENALTY:{requiresPlayer:true,description:'Penalty attempt'},YELLOW_CARD:{requiresPlayer:true,description:'Yellow card'},RED_CARD:{requiresPlayer:true,description:'Red card'},SUBSTITUTION:{requiresPlayer:false,description:'Player substitution'},POSSESSION_INTERVAL:{requiresPlayer:false,description:'Timed team possession interval'},MATCH_ATTENDANCE:{requiresPlayer:false,description:'Official or estimated crowd attendance'}};
const methods=['LEFT_FOOT','RIGHT_FOOT','HEAD','OTHER'];const teams=['home','away'];
@Injectable()
export class EventValidationService {
  catalogue(){return Object.entries(rules).map(([type,rule])=>({type,...rule}))}
  requiresPlayer(type:string){return rules[type]?.requiresPlayer??false}
  validate(type:string,payload:Record<string,unknown>){
    if(!rules[type])throw new BadRequestException(`Unsupported event type: ${type}`);const value={...payload};if(type!=='MATCH_ATTENDANCE')this.oneOf(value,'team',teams);
    if(['GOAL','SHOT','PENALTY'].includes(type))this.oneOf(value,'scoringMethod',methods);
    if(['GOAL','SHOT','FREE_KICK'].includes(type))this.number(value,'distanceMeters',0,100);
    if(type==='GOAL')this.boolean(value,'isPenalty');
    if(type==='SHOT')this.oneOf(value,'outcome',['ON_TARGET','OFF_TARGET','BLOCKED','WOODWORK','GOAL']);
    if(type==='FREE_KICK')this.oneOf(value,'outcome',['AWARDED','TAKEN','ON_TARGET','OFF_TARGET','BLOCKED','GOAL']);
    if(type==='CORNER')this.oneOf(value,'side',['LEFT','RIGHT']);
    if(type==='FOUL'){this.string(value,'fouledPlayerId');this.oneOf(value,'foulType',['TRIP','PUSH','HANDBALL','TACKLE','HOLDING','OTHER'])}
    if(type==='PENALTY')this.oneOf(value,'outcome',['SCORED','SAVED','MISSED','WOODWORK']);
    if(type==='TOUCH'){this.number(value,'x',0,100);this.number(value,'y',0,100)}
    if(type==='POSSESSION_INTERVAL')this.number(value,'durationSeconds',1,600);
    if(type==='MATCH_ATTENDANCE'){this.number(value,'attendance',0,200000);if(value.source)this.oneOf(value,'source',['OFFICIAL','ESTIMATE','MEDIA','CLUB'])}
    if(type==='SUBSTITUTION'){this.string(value,'playerOnId');this.string(value,'playerOffId')}
    return value;
  }
  private oneOf(value:Record<string,unknown>,key:string,allowed:string[]){if(!allowed.includes(String(value[key])))throw new BadRequestException(`${key} must be one of: ${allowed.join(', ')}`)}
  private number(value:Record<string,unknown>,key:string,min:number,max:number){const number=Number(value[key]);if(!Number.isFinite(number)||number<min||number>max)throw new BadRequestException(`${key} must be between ${min} and ${max}`);value[key]=number}
  private boolean(value:Record<string,unknown>,key:string){if(typeof value[key]!=='boolean')throw new BadRequestException(`${key} must be boolean`)}
  private string(value:Record<string,unknown>,key:string){if(typeof value[key]!=='string'||!String(value[key]).trim())throw new BadRequestException(`${key} is required`)}
}
