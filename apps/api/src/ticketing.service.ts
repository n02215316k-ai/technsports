import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { TicketOrderStatus, TicketStatus } from '@prisma/client';
import { PrismaService } from './prisma.service';

export type TicketProductInput={matchId:string;name:string;description?:string;priceMinor:number;currency:string;quantityTotal:number;perOrderLimit?:number;saleStartsAt?:string;saleEndsAt?:string;gate?:string;section?:string;active?:boolean};
export type CreateOrderInput={matchId:string;buyerName:string;buyerEmail:string;buyerPhone?:string;paymentMethod:string;items:{productId:string;quantity:number}[]};
export type PaymentWebhookInput={publicRef:string;status:string;paymentReference?:string;amountMinor?:number;currency?:string};

@Injectable()
export class TicketingService {
  constructor(private readonly db:PrismaService){}

  async inventory(matchId:string){
    await this.expireStaleOrders(matchId);
    const match=await this.db.match.findUnique({where:{id:matchId},include:{homeTeam:true,awayTeam:true,venue:true,season:{include:{competition:true}}}});
    if(!match)throw new NotFoundException('Fixture not found');
    const products=await this.db.ticketProduct.findMany({where:{matchId,active:true},orderBy:{priceMinor:'asc'}});
    const now=new Date();
    return {match,products:products.map(product=>({...product,available:Math.max(0,product.quantityTotal-product.quantitySold),onSale:this.onSale(product,now)}))};
  }

  async createProduct(input:TicketProductInput){
    if(input.quantityTotal<1)throw new BadRequestException('Ticket quantity must be at least 1');
    if(input.priceMinor<0)throw new BadRequestException('Ticket price cannot be negative');
    const match=await this.db.match.findUnique({where:{id:input.matchId}});
    if(!match)throw new NotFoundException('Fixture not found');
    return this.db.ticketProduct.create({data:{matchId:input.matchId,name:input.name.trim(),description:input.description?.trim(),priceMinor:input.priceMinor,currency:(input.currency||'USD').trim().toUpperCase(),quantityTotal:input.quantityTotal,perOrderLimit:input.perOrderLimit??10,saleStartsAt:input.saleStartsAt?new Date(input.saleStartsAt):undefined,saleEndsAt:input.saleEndsAt?new Date(input.saleEndsAt):undefined,gate:input.gate?.trim(),section:input.section?.trim(),active:input.active??true},include:{match:{include:{homeTeam:true,awayTeam:true}}}}).catch(error=>{if(error?.code==='P2002')throw new ConflictException('A ticket class with this name already exists for the fixture');throw error});
  }

  async createOrder(input:CreateOrderInput,userId?:string){
    if(!input.items?.length)throw new BadRequestException('Select at least one ticket');
    const buyerEmail=input.buyerEmail.trim().toLowerCase();
    const buyerName=input.buyerName.trim();
    if(buyerName.length<2)throw new BadRequestException('Buyer name is required');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail))throw new BadRequestException('Valid buyer email is required');
    await this.expireStaleOrders(input.matchId);
    const publicRef=this.ref();
    const expiresAt=new Date(Date.now()+15*60*1000);
    return this.db.$transaction(async tx=>{
      const match=await tx.match.findUnique({where:{id:input.matchId},include:{homeTeam:true,awayTeam:true}});
      if(!match)throw new NotFoundException('Fixture not found');
      let amountMinor=0;let currency='USD';
      const items:{productId:string;quantity:number;unitPriceMinor:number;currency:string}[]=[];
      for(const line of input.items){
        if(!Number.isInteger(line.quantity)||line.quantity<1)throw new BadRequestException('Ticket quantity must be positive');
        const product=await tx.ticketProduct.findUnique({where:{id:line.productId}});
        if(!product||product.matchId!==input.matchId||!product.active)throw new BadRequestException('Ticket class is not available for this fixture');
        if(!this.onSale(product,new Date()))throw new BadRequestException(`${product.name} is not currently on sale`);
        if(line.quantity>product.perOrderLimit)throw new BadRequestException(`${product.name} limit is ${product.perOrderLimit} per order`);
        const available=product.quantityTotal-product.quantitySold;
        if(available<line.quantity)throw new ConflictException(`${product.name} has only ${available} ticket(s) left`);
        await tx.ticketProduct.update({where:{id:product.id},data:{quantitySold:{increment:line.quantity}}});
        currency=product.currency;amountMinor+=product.priceMinor*line.quantity;items.push({productId:product.id,quantity:line.quantity,unitPriceMinor:product.priceMinor,currency:product.currency});
      }
      const order=await tx.ticketOrder.create({data:{publicRef,matchId:input.matchId,userId,buyerName,buyerEmail,buyerPhone:input.buyerPhone?.trim(),paymentMethod:input.paymentMethod,amountMinor,currency,expiresAt,status:amountMinor===0?TicketOrderStatus.PAID:TicketOrderStatus.PENDING_PAYMENT,paidAt:amountMinor===0?new Date():undefined,items:{create:items}} as any,include:{items:{include:{product:true}},match:{include:{homeTeam:true,awayTeam:true,venue:true}}}});
      if(amountMinor===0)return this.issueTickets(order.id,tx);
      return order;
    });
  }

  async getOrder(publicRef:string){
    const order=await this.db.ticketOrder.findUnique({where:{publicRef},include:{items:{include:{product:true}},tickets:{include:{product:true}},match:{include:{homeTeam:true,awayTeam:true,venue:true,season:{include:{competition:true}}}}}});
    if(!order)throw new NotFoundException('Ticket order not found');
    return order;
  }

  async markPaid(publicRef:string,paymentReference?:string){
    const order=await this.db.ticketOrder.findUnique({where:{publicRef},include:{items:true,tickets:true}});
    if(!order)throw new NotFoundException('Ticket order not found');
    if(order.status===TicketOrderStatus.EXPIRED)throw new BadRequestException('Order has expired');
    if(order.status===TicketOrderStatus.CANCELLED)throw new BadRequestException('Order is cancelled');
    await this.db.ticketOrder.update({where:{id:order.id},data:{status:TicketOrderStatus.PAID,paidAt:new Date(),paymentReference}});
    return this.issueTickets(order.id);
  }

  async paymentWebhook(provider:string,input:PaymentWebhookInput,headers:Record<string,string|string[]|undefined>){
    const name=provider.trim().toUpperCase().replace(/[^A-Z0-9_]/g,'_');
    const configured=process.env[`${name}_WEBHOOK_SECRET`]||process.env.PAYMENT_WEBHOOK_SECRET;
    if(!configured||configured.includes('replace-with'))throw new BadRequestException('Payment webhook secret is not configured');
    const received=this.header(headers,'x-technsports-webhook-secret')||this.header(headers,'x-webhook-secret')||this.header(headers,'x-paynow-signature');
    if(received!==configured)throw new UnauthorizedException('Invalid payment webhook signature');
    const status=input.status.trim().toUpperCase();
    if(!['PAID','SUCCESS','COMPLETED','CONFIRMED'].includes(status))return{accepted:true,processed:false,status,reason:'Payment is not successful'};
    const order=await this.db.ticketOrder.findUnique({where:{publicRef:input.publicRef}});
    if(!order)throw new NotFoundException('Ticket order not found');
    if(input.amountMinor!==undefined&&input.amountMinor!==order.amountMinor)throw new BadRequestException('Payment amount does not match ticket order');
    if(input.currency&&input.currency.toUpperCase()!==order.currency)throw new BadRequestException('Payment currency does not match ticket order');
    const updated=await this.markPaid(input.publicRef,input.paymentReference??`${name}-WEBHOOK`);
    return{accepted:true,processed:true,provider:name,order:updated};
  }

  async validate(ticketCode:string,device?:string){
    const ticket=await this.db.ticket.findUnique({where:{ticketCode},include:{match:{include:{homeTeam:true,awayTeam:true,venue:true}},product:true,order:true}});
    if(!ticket)throw new NotFoundException('Ticket not found');
    if(ticket.status===TicketStatus.CHECKED_IN)return {valid:false,reason:'ALREADY_CHECKED_IN',ticket};
    if(ticket.status!==TicketStatus.ISSUED)return {valid:false,reason:ticket.status,ticket};
    const updated=await this.db.ticket.update({where:{id:ticket.id},data:{status:TicketStatus.CHECKED_IN,checkedInAt:new Date(),checkInDevice:device},include:{match:{include:{homeTeam:true,awayTeam:true,venue:true}},product:true,order:true}});
    return {valid:true,ticket:updated};
  }

  private async issueTickets(orderId:string,client=this.db as any){
    const order=await client.ticketOrder.findUnique({where:{id:orderId},include:{items:{include:{product:true}},tickets:true,match:{include:{homeTeam:true,awayTeam:true,venue:true,season:{include:{competition:true}}}}}});
    if(!order)throw new NotFoundException('Ticket order not found');
    if(order.tickets.length)return order;
    for(const item of order.items){
      for(let index=0;index<item.quantity;index++){
        const ticketCode=this.ticketCode();
        await client.ticket.create({data:{orderId:order.id,productId:item.productId,matchId:order.matchId,ticketCode,qrPayload:JSON.stringify({type:'TECHNSPORTS_TICKET',ticketCode,orderRef:order.publicRef,matchId:order.matchId}),holderName:order.buyerName,holderEmail:order.buyerEmail}});
      }
    }
    return client.ticketOrder.findUnique({where:{id:orderId},include:{items:{include:{product:true}},tickets:{include:{product:true}},match:{include:{homeTeam:true,awayTeam:true,venue:true,season:{include:{competition:true}}}}}});
  }

  private async expireStaleOrders(matchId?:string){
    const stale=await this.db.ticketOrder.findMany({where:{matchId,status:TicketOrderStatus.PENDING_PAYMENT,expiresAt:{lt:new Date()}},include:{items:true},take:100});
    for(const order of stale){
      await this.db.$transaction(async tx=>{
        await tx.ticketOrder.update({where:{id:order.id},data:{status:TicketOrderStatus.EXPIRED,cancelledAt:new Date()}});
        for(const item of order.items)await tx.ticketProduct.update({where:{id:item.productId},data:{quantitySold:{decrement:item.quantity}}});
      });
    }
  }

  private onSale(product:{saleStartsAt:Date|null;saleEndsAt:Date|null;active:boolean},now:Date){return product.active&&(!product.saleStartsAt||product.saleStartsAt<=now)&&(!product.saleEndsAt||product.saleEndsAt>=now)}
  private header(headers:Record<string,string|string[]|undefined>,key:string){const value=headers[key]??headers[key.toLowerCase()];return Array.isArray(value)?value[0]:value}
  private ref(){return `TS-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`}
  private ticketCode(){return `TKT-${randomBytes(12).toString('hex').toUpperCase()}`}
}
