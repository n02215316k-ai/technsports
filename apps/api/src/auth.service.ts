import { ConflictException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { EmailService } from './email.service';
import { PrismaService } from './prisma.service';

export type AppRole='SUPPORTER'|'COLLECTOR'|'REVIEWER'|'EDITOR'|'ADMIN';
const SESSION_MS=1000*60*60*24*14;
const VERIFY_MS=1000*60*30;

@Injectable()
export class AuthService {
  constructor(private readonly db:PrismaService,private readonly email:EmailService){}

  async signup(input:{email:string;displayName:string;username:string;password:string;role:'SUPPORTER'|'COLLECTOR'}){
    const email=input.email.trim().toLowerCase();const username=input.username.trim().toLowerCase();
    const existing=await this.db.user.findFirst({where:{OR:[{email},{username}]},select:{email:true,username:true}});
    if(existing?.email===email)throw new ConflictException('An account already exists for this email');
    if(existing)throw new ConflictException('That username is already in use');
    const verificationToken=randomBytes(32).toString('base64url');
    const user=await this.db.user.create({data:{email,username,displayName:input.displayName.trim(),passwordHash:this.password(input.password),role:input.role as UserRole,verificationTokenHash:this.hash(verificationToken),verificationTokenExpiresAt:new Date(Date.now()+VERIFY_MS)}});
    await this.email.sendVerification(user.email,user.displayName,verificationToken);
    return {user:this.publicUser(user),requiresVerification:true};
  }

  async verifyEmail(token:string,request?:any){
    const now=new Date();const user=await this.db.user.findFirst({where:{verificationTokenHash:this.hash(token),verificationTokenExpiresAt:{gt:now}}});
    if(!user)throw new UnauthorizedException('Verification link is invalid or expired');
    const verified=await this.db.user.update({where:{id:user.id},data:{emailVerifiedAt:now,verificationTokenHash:null,verificationTokenExpiresAt:null}});
    return {user:this.publicUser(verified),token:await this.createSession(verified.id,request)};
  }

  async resendVerification(emailInput:string){
    const email=emailInput.trim().toLowerCase();const user=await this.db.user.findUnique({where:{email}});
    if(!user||user.emailVerifiedAt)return {sent:true};
    const token=randomBytes(32).toString('base64url');
    await this.db.user.update({where:{id:user.id},data:{verificationTokenHash:this.hash(token),verificationTokenExpiresAt:new Date(Date.now()+VERIFY_MS)}});
    await this.email.sendVerification(user.email,user.displayName,token);return {sent:true};
  }

  async signin(emailInput:string,password:string,request?:any){
    const email=emailInput.trim().toLowerCase();const user=await this.db.user.findUnique({where:{email}});
    if(!user?.passwordHash){this.fakePassword(password);throw new UnauthorizedException('Invalid email or password')}
    if(user.lockedUntil&&user.lockedUntil>new Date())throw new HttpException('Account temporarily locked. Try again later.',HttpStatus.TOO_MANY_REQUESTS);
    if(!this.verifyPassword(password,user.passwordHash)){
      const attempts=user.failedLoginAttempts+1;await this.db.user.update({where:{id:user.id},data:{failedLoginAttempts:attempts,lockedUntil:attempts>=5?new Date(Date.now()+15*60*1000):null}});
      throw new UnauthorizedException('Invalid email or password');
    }
    if(!user.emailVerifiedAt)throw new UnauthorizedException('Verify your email before signing in');
    await this.db.user.update({where:{id:user.id},data:{failedLoginAttempts:0,lockedUntil:null,lastLoginAt:new Date()}});
    return {user:this.publicUser(user),token:await this.createSession(user.id,request)};
  }

  async fromRequest(request:any){
    const raw=this.cookie(request.headers?.cookie??'','__Host-technsports_session')??this.cookie(request.headers?.cookie??'','technsports_session');if(!raw)return null;
    const session=await this.db.authSession.findUnique({where:{tokenHash:this.hash(raw)},include:{user:true}});if(!session||session.expiresAt<=new Date()){if(session)await this.db.authSession.delete({where:{id:session.id}});return null}
    if(Date.now()-session.lastUsedAt.getTime()>5*60*1000)await this.db.authSession.update({where:{id:session.id},data:{lastUsedAt:new Date()}});
    return this.publicUser(session.user);
  }
  async signout(request:any){const raw=this.cookie(request.headers?.cookie??'','__Host-technsports_session')??this.cookie(request.headers?.cookie??'','technsports_session');if(raw)await this.db.authSession.deleteMany({where:{tokenHash:this.hash(raw)}})}
  async users(){return (await this.db.user.findMany({orderBy:{createdAt:'desc'}})).map(user=>this.publicUser(user))}
  async assignRole(userId:string,role:AppRole){const user=await this.db.user.update({where:{id:userId},data:{role:role as UserRole}}).catch(()=>{throw new UnauthorizedException('User not found')});return this.publicUser(user)}
  private async createSession(userId:string,request?:any){const token=randomBytes(32).toString('base64url');await this.db.authSession.create({data:{userId,tokenHash:this.hash(token),expiresAt:new Date(Date.now()+SESSION_MS),userAgentHash:request?.headers?.['user-agent']?this.hash(request.headers['user-agent']):null,ipHash:request?.ip?this.hash(request.ip):null}});return token}
  private publicUser(user:any){return {id:user.id,email:user.email,displayName:user.displayName,username:user.username,role:user.role,emailVerified:Boolean(user.emailVerifiedAt),createdAt:user.createdAt}}
  private password(value:string){const salt=randomBytes(16).toString('hex');return `scrypt$${salt}$${scryptSync(value+(process.env.PASSWORD_PEPPER??''),salt,64).toString('hex')}`}
  private verifyPassword(value:string,stored:string){const [,salt,hex]=stored.split('$');if(!salt||!hex)return false;const supplied=scryptSync(value+(process.env.PASSWORD_PEPPER??''),salt,64);const expected=Buffer.from(hex,'hex');return supplied.length===expected.length&&timingSafeEqual(supplied,expected)}
  private fakePassword(value:string){scryptSync(value,'00000000000000000000000000000000',64)}
  private hash(value:string){return createHash('sha256').update(value).digest('hex')}
  private cookie(header:string,name:string){return header.split(';').map(x=>x.trim()).find(x=>x.startsWith(`${name}=`))?.slice(name.length+1)}
}
