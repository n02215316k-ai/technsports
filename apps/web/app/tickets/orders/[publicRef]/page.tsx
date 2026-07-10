'use client';

import Link from 'next/link';
import QRCode from 'qrcode';
import { ArrowLeft, CheckCircle2, Clock, Ticket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { API_URL, formatDate, useApi } from '@/lib/api';

type Order={publicRef:string;status:string;buyerName:string;buyerEmail:string;amountMinor:number;currency:string;paymentMethod:string;paymentReference?:string;expiresAt:string;match:{id:string;kickoffAt:string;homeTeam:{name:string};awayTeam:{name:string};venue?:{name:string};venueName?:string};items:{quantity:number;product:{name:string}}[];tickets:{ticketCode:string;qrPayload:string;holderName:string;status:string;product:{name:string;gate?:string;section?:string}}[]};

export default function TicketOrderPage(){
  const {publicRef}=useParams<{publicRef:string}>();
  const {data,error,loading}=useApi<Order>(`/tickets/orders/${publicRef}`);
  if(loading)return <main className="page-shell">Loading order…</main>;
  if(error||!data)return <main className="page-shell"><div className="admin-error">{error||'Order not found'}</div></main>;
  return <main className="page-shell ticket-shell">
    <Link href={`/matches/${data.match.id}`} className="back"><ArrowLeft/> Match page</Link>
    <section className="ticket-summary"><span className={`ticket-status ${data.status.toLowerCase()}`}>{data.status.replace('_',' ')}</span><h2>Ticket order {data.publicRef}</h2><dl><dt>Match</dt><dd>{data.match.homeTeam.name} v {data.match.awayTeam.name}</dd><dt>Date</dt><dd>{formatDate(data.match.kickoffAt)}</dd><dt>Venue</dt><dd>{data.match.venue?.name??data.match.venueName??'Venue TBC'}</dd><dt>Buyer</dt><dd>{data.buyerName} · {data.buyerEmail}</dd><dt>Total</dt><dd>{data.currency} {(data.amountMinor/100).toFixed(2)}</dd><dt>Payment</dt><dd>{data.paymentMethod}{data.paymentReference?` · ${data.paymentReference}`:''}</dd></dl>{data.status==='PENDING_PAYMENT'&&<p className="ticket-note"><Clock size={14}/> Pay using the selected method and ask an admin to confirm the payment reference. Reservation expires {new Date(data.expiresAt).toLocaleString('en-ZW')}.</p>}</section>
    <section className="issued-tickets"><h2><Ticket/> Issued tickets</h2>{data.tickets.length?data.tickets.map(ticket=><TicketCard ticket={ticket} key={ticket.ticketCode}/>):<div className="empty-state"><CheckCircle2/><b>Tickets pending payment confirmation</b><span>Once payment is marked paid, QR tickets will appear here.</span></div>}</section>
  </main>;
}

function TicketCard({ticket}:{ticket:Order['tickets'][number]}){
  const [qr,setQr]=useState('');
  useEffect(()=>{QRCode.toDataURL(ticket.qrPayload,{margin:1,width:180}).then(setQr).catch(()=>setQr(''))},[ticket.qrPayload]);
  return <article className="ticket-card">{qr&&<img src={qr} alt={`QR for ${ticket.ticketCode}`}/>}<div><span className={`ticket-status ${ticket.status.toLowerCase()}`}>{ticket.status.replace('_',' ')}</span><b>{ticket.product.name}</b><small>{ticket.product.gate?`Gate ${ticket.product.gate}`:'Gate TBC'}{ticket.product.section?` · ${ticket.product.section}`:''}</small><code>{ticket.ticketCode}</code></div></article>;
}
