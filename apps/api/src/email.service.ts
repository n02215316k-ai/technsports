import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter:Transporter;
  private readonly from=process.env.EMAIL_FROM??'TechnSports <no-reply@technsports.co.zw>';
  constructor(){
    const host=process.env.SMTP_HOST;
    if(host){
      const requireTLS=process.env.SMTP_REQUIRE_TLS!==undefined?process.env.SMTP_REQUIRE_TLS==='true':process.env.NODE_ENV==='production';
      this.transporter=nodemailer.createTransport({host,port:Number(process.env.SMTP_PORT??587),secure:process.env.SMTP_SECURE==='true',auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}:undefined,requireTLS});
    }else{
      if(process.env.NODE_ENV==='production')throw new ServiceUnavailableException('SMTP configuration is required in production');
      this.transporter=nodemailer.createTransport({jsonTransport:true});
    }
  }
  async sendVerification(to:string,displayName:string,token:string){
    const base=(process.env.WEB_URL??'http://localhost:3000').replace(/\/$/,'');
    const url=`${base}/verify-email?token=${encodeURIComponent(token)}`;
    const safeName=this.escape(displayName);
    const info=await this.transporter.sendMail({from:this.from,to,subject:'Verify your TechnSports account',text:`Hello ${displayName}, verify your account: ${url}\n\nThis link expires in 30 minutes. If you did not create this account, ignore this email.`,html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h1 style="font-size:22px">Verify your TechnSports account</h1><p>Hello ${safeName},</p><p>Confirm your email address to activate your account.</p><p><a href="${url}" style="display:inline-block;background:#006b47;color:#fff;padding:12px 18px;text-decoration:none">Verify email</a></p><p style="color:#66736d;font-size:13px">This link expires in 30 minutes. If you did not create this account, ignore this email.</p></div>`});
    return info.messageId;
  }
  private escape(value:string){return value.replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]!))}
}
