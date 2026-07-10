'use client';

import Link from 'next/link';
import { ArrowLeft, CreditCard, MapPin, Ticket } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { API_URL, formatDate, useApi } from '@/lib/api';

type Product={id:string;name:string;description?:string;priceMinor:number;currency:string;available:number;perOrderLimit:number;gate?:string;section?:string;onSale:boolean};
type Inventory={match:{id:string;kickoffAt:string;round?:string;homeTeam:{name:string};awayTeam:{name:string};venue?:{name:string};venueName?:string;season:{label:string;competition:{name:string}}};products:Product[]};

export default function TicketPurchasePage(){
  const {matchId}=useParams<{matchId:string}>();
  const router=useRouter();
  const {data,error,loading}=useApi<Inventory>(`/tickets/matches/${matchId}`);
  const [qty,setQty]=useState<Record<string,number>>({});
  const [notice,setNotice]=useState('');
  const [err,setErr]=useState('');
  const total=useMemo(()=>data?.products.reduce((sum,p)=>sum+(qty[p.id]||0)*p.priceMinor,0)??0,[data,qty]);
  const currency=data?.products.find(p=>(qty[p.id]||0)>0)?.currency??data?.products[0]?.currency??'USD';
  const submit=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();setErr('');setNotice('');
    const form=new FormData(e.currentTarget);
    const items=Object.entries(qty).filter(([,quantity])=>quantity>0).map(([productId,quantity])=>({productId,quantity}));
    if(!items.length){setErr('Select at least one ticket.');return}
    const response=await fetch(`${API_URL}/tickets/orders`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({matchId,buyerName:form.get('buyerName'),buyerEmail:form.get('buyerEmail'),buyerPhone:form.get('buyerPhone'),paymentMethod:form.get('paymentMethod'),items})});
    const body=await response.json().catch(()=>({}));
    if(!response.ok){setErr(Array.isArray(body.message)?body.message.join(', '):body.message||'Could not create order');return}
    setNotice('Order reserved. Redirecting…');router.push(`/tickets/orders/${body.publicRef}`);
  };
  if(loading)return <main className="page-shell">Loading tickets…</main>;
  if(error||!data)return <main className="page-shell"><div className="admin-error">{error||'Tickets unavailable'}</div></main>;
  const match=data.match;
  return <main className="page-shell ticket-shell">
    <Link href={`/matches/${matchId}`} className="back"><ArrowLeft/> Back to match</Link>
    <section className="ticket-event"><div><small>HOME</small><h1>{match.homeTeam.name}</h1></div><strong>Tickets</strong><div><small>AWAY</small><h1>{match.awayTeam.name}</h1></div><small>{match.season.competition.name} · {match.round??match.season.label} · {formatDate(match.kickoffAt)} · <MapPin size={12}/>{match.venue?.name??match.venueName??'Venue TBC'}</small></section>
    <div className="ticket-grid">
      <section className="ticket-products"><h2>Choose tickets</h2>{data.products.length?data.products.map(product=><div className="ticket-line" key={product.id}><b>{product.name}<small>{product.description??'Match ticket'}{product.gate?` · Gate ${product.gate}`:''}{product.section?` · ${product.section}`:''}</small><small>{product.available} available · limit {product.perOrderLimit}</small></b><strong>{product.currency} {(product.priceMinor/100).toFixed(2)}</strong><input type="number" min="0" max={Math.min(product.available,product.perOrderLimit)} disabled={!product.onSale||product.available<1} value={qty[product.id]??0} onChange={e=>setQty(current=>({...current,[product.id]:Number(e.target.value)}))}/></div>):<div className="empty-state"><Ticket/><b>No ticket classes yet</b><span>Tickets will appear after admin setup.</span></div>}</section>
      <section className="ticket-checkout"><h2>Buyer details</h2>{err&&<div className="admin-error">{err}</div>}{notice&&<div className="admin-notice">{notice}</div>}<form onSubmit={submit}><label>Full name<input name="buyerName" required minLength={2}/></label><label>Email<input name="buyerEmail" type="email" required/></label><label>Phone<input name="buyerPhone"/></label><label>Payment method<select name="paymentMethod"><option value="ECOCASH">EcoCash / mobile money</option><option value="ZIPIT">ZIPIT / bank transfer</option><option value="CASH">Cash office confirmation</option><option value="CARD_GATEWAY_PENDING">Online card gateway pending setup</option></select></label><div className="ticket-total"><span>Total</span><b>{currency} {(total/100).toFixed(2)}</b></div><p className="ticket-note">Your tickets are reserved for 15 minutes. Tickets are issued after payment is confirmed. Once a gateway is connected, this step can be automated by webhook.</p><button className="primary" disabled={!data.products.length}><CreditCard/> Reserve tickets</button></form></section>
    </div>
  </main>;
}
