import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsDateString, IsEmail, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { AdminKeyGuard } from './administration.controller';
import { TicketingService } from './ticketing.service';
import { AuthService } from './auth.service';

class TicketProductDto{ @IsString() matchId!:string; @IsString() @Length(2,80) name!:string; @IsOptional() @IsString() description?:string; @IsInt() @Min(0) priceMinor!:number; @IsString() currency!:string; @IsInt() @Min(1) quantityTotal!:number; @IsOptional() @IsInt() @Min(1) perOrderLimit?:number; @IsOptional() @IsDateString() saleStartsAt?:string; @IsOptional() @IsDateString() saleEndsAt?:string; @IsOptional() @IsString() gate?:string; @IsOptional() @IsString() section?:string; }
class OrderItemDto{ @IsString() productId!:string; @IsInt() @Min(1) quantity!:number; }
class CreateOrderDto{ @IsString() matchId!:string; @IsString() @Length(2,120) buyerName!:string; @IsEmail() buyerEmail!:string; @IsOptional() @IsString() buyerPhone?:string; @IsString() paymentMethod!:string; @IsArray() items!:OrderItemDto[]; }
class PaidDto{ @IsOptional() @IsString() paymentReference?:string; }
class ValidateDto{ @IsString() ticketCode!:string; @IsOptional() @IsString() device?:string; }
class PaymentWebhookDto{ @IsString() publicRef!:string; @IsString() status!:string; @IsOptional() @IsString() paymentReference?:string; @IsOptional() @IsInt() @Min(0) amountMinor?:number; @IsOptional() @IsString() currency?:string; }

@Controller('tickets')
export class TicketingController {
  constructor(private readonly tickets:TicketingService,private readonly auth:AuthService){}
  @Get('matches/:matchId') inventory(@Param('matchId') matchId:string){return this.tickets.inventory(matchId)}
  @Post('orders') async order(@Body() dto:CreateOrderDto,@Req() request:any){const user=await this.auth.fromRequest(request);return this.tickets.createOrder(dto,user?.id)}
  @Get('orders/:publicRef') getOrder(@Param('publicRef') publicRef:string){return this.tickets.getOrder(publicRef)}
  @Post('webhooks/:provider') paymentWebhook(@Param('provider') provider:string,@Body() dto:PaymentWebhookDto,@Req() request:any){return this.tickets.paymentWebhook(provider,dto,request.headers)}
}

@Controller('admin/tickets')
@UseGuards(AdminKeyGuard)
export class AdminTicketingController {
  constructor(private readonly tickets:TicketingService){}
  @Post('products') product(@Body() dto:TicketProductDto){return this.tickets.createProduct(dto)}
  @Post('orders/:publicRef/paid') paid(@Param('publicRef') publicRef:string,@Body() dto:PaidDto){return this.tickets.markPaid(publicRef,dto.paymentReference)}
  @Post('validate') validate(@Body() dto:ValidateDto){return this.tickets.validate(dto.ticketCode,dto.device)}
}
