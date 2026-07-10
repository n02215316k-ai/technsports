import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const { TicketingService }=require('../dist/ticketing.service.js');
const { TicketStatus }=require('@prisma/client');

test('ticket inventory exposes live availability and sale state',async()=>{
  const now=new Date();
  const db={
    ticketOrder:{findMany:async()=>[]},
    match:{findUnique:async()=>({id:'m1',homeTeam:{name:'Dynamos'},awayTeam:{name:'CAPS United'},venue:{name:'National Sports Stadium'},season:{competition:{name:'Premier Soccer League'}}})},
    ticketProduct:{findMany:async()=>[
      {id:'p1',name:'Grand Stand',priceMinor:500,currency:'USD',quantityTotal:100,quantitySold:25,active:true,saleStartsAt:new Date(now.getTime()-1000),saleEndsAt:new Date(now.getTime()+100000),perOrderLimit:4},
      {id:'p2',name:'VIP',priceMinor:1500,currency:'USD',quantityTotal:20,quantitySold:20,active:true,saleStartsAt:null,saleEndsAt:null,perOrderLimit:2}
    ]}
  };
  const inventory=await new TicketingService(db).inventory('m1');
  assert.equal(inventory.products[0].available,75);
  assert.equal(inventory.products[0].onSale,true);
  assert.equal(inventory.products[1].available,0);
});

test('ticket validation checks in issued tickets only once',async()=>{
  const issued={id:'t1',ticketCode:'TKT-1',status:TicketStatus.ISSUED,match:{},product:{name:'Grand Stand'},order:{}};
  const db={
    ticket:{
      findUnique:async()=>issued,
      update:async({data})=>({...issued,...data,status:TicketStatus.CHECKED_IN})
    }
  };
  const result=await new TicketingService(db).validate('TKT-1','gate-a');
  assert.equal(result.valid,true);
  assert.equal(result.ticket.status,TicketStatus.CHECKED_IN);
  assert.equal(result.ticket.checkInDevice,'gate-a');

  const repeatDb={ticket:{findUnique:async()=>({...issued,status:TicketStatus.CHECKED_IN})}};
  const repeat=await new TicketingService(repeatDb).validate('TKT-1','gate-a');
  assert.equal(repeat.valid,false);
  assert.equal(repeat.reason,'ALREADY_CHECKED_IN');
});
