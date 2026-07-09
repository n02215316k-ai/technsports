import { Body, CanActivate, Controller, ExecutionContext, Get, Injectable, Post, Query, Req, Res, SetMetadata, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsIn, IsString, Length, Matches } from 'class-validator';
import { AppRole, AuthService } from './auth.service';

class SignupDto{@IsEmail() email!:string;@IsString() @Length(2,80) displayName!:string;@IsString() @Length(3,30) @Matches(/^[a-zA-Z0-9_]+$/,{message:'Username may contain only letters, numbers and underscores'}) username!:string;@IsString() @Length(10,128) password!:string;@IsIn(['SUPPORTER','COLLECTOR']) role!:'SUPPORTER'|'COLLECTOR'}
class SigninDto{@IsEmail() email!:string;@IsString() password!:string}
class ResendDto{@IsEmail() email!:string}
export const ROLES='technsports_roles';export const RequireRoles=(...roles:AppRole[])=>SetMetadata(ROLES,roles);

@Injectable()
export class RoleGuard implements CanActivate {constructor(private readonly reflector:Reflector,private readonly auth:AuthService){}async canActivate(context:ExecutionContext){const request=context.switchToHttp().getRequest();const user=await this.auth.fromRequest(request);const roles=this.reflector.getAllAndOverride<AppRole[]>(ROLES,[context.getHandler(),context.getClass()])??[];if(!user||!roles.includes(user.role))throw new UnauthorizedException('Sign in with an authorised role');request.user=user;return true}}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth:AuthService){}
  @Post('signup') @Throttle({default:{limit:5,ttl:60000}}) signup(@Body() dto:SignupDto){return this.auth.signup(dto)}
  @Get('verify-email') @Throttle({default:{limit:10,ttl:60000}}) async verify(@Query('token') token:string,@Req() request:any,@Res({passthrough:true}) response:any){const result=await this.auth.verifyEmail(token,request);this.setCookie(response,result.token);return result.user}
  @Post('resend-verification') @Throttle({default:{limit:3,ttl:60000}}) resend(@Body() dto:ResendDto){return this.auth.resendVerification(dto.email)}
  @Post('signin') @Throttle({default:{limit:8,ttl:60000}}) async signin(@Body() dto:SigninDto,@Req() request:any,@Res({passthrough:true})response:any){const result=await this.auth.signin(dto.email,dto.password,request);this.setCookie(response,result.token);return result.user}
  @Get('me') async me(@Req() request:any){return {user:await this.auth.fromRequest(request)}}
  @Post('signout') async signout(@Req() request:any,@Res({passthrough:true})response:any){await this.auth.signout(request);response.clearCookie('__Host-technsports_session',{path:'/'});response.clearCookie('technsports_session',{path:'/'});return {signedOut:true}}
  private setCookie(response:any,token:string){const production=process.env.NODE_ENV==='production';const secure=process.env.COOKIE_SECURE!==undefined?process.env.COOKIE_SECURE==='true':production;response.cookie(production&&secure?'__Host-technsports_session':'technsports_session',token,{httpOnly:true,sameSite:'strict',secure,path:'/',maxAge:1000*60*60*24*14})}
}
