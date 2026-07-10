'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, QrCode, Ticket } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { API_URL, formatDate, useApi } from '@/lib/api';

type Fixture={id:string;kickoffAt:string;round?:string;homeTeam:{name:string};awayTeam:{name:string};venue?:{name:string};venueName?:string;season:{label:string;competition:{name:string}}};
type Product={id:string;name:string;priceMinor:number;currency:string;quantityTotal:number;quantitySold:number;available:number;gate?:string;section?:string;onSale:boolean};
type Inventory={match:Fixture;products:Product[]};

export default function AdminTicketsPage(){
  const [key,setKey]=useState('');
  const [fixtures,setFixtures]=useState<Fixture[]>([]);
  const [matchId,setMatchId]=useState('');
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [orderRef,setOrderRef]=useState('');
  const [paymentReference,setPaymentReference]=useState('');
  const [ticketCode,setTicketCode]=useState('');
  const [validation,setValidation]=useState<any>(null);
  const {data:inventory}=useApi<Inventory>(matchId?`/tickets/matches/${matchId}`:null);
  const selected=useMemo(()=>fixtures.find(f=>f.id===matchId),[fixtures,matchId]);

  const loadFixtures=useCallback(()=>fetch(`${API_URL}/catalog/fixtures`,{credentials:'include'}).then(r=>r.json()).then((data)=>{setFixtures(data);if(data[0]&&!matchId)setMatchId(data[0].id)}).catch(()=>setFixtures([])),[matchId]);
  useEffect(()=>{loadFixtures()},[loadFixtures]);

  const headers=()=>({'Content-Type':'application/json',...(key?{'x-admin-key':key}:{})});
  const submitProduct=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();setError('');setNotice('');
    const form=new FormData(e.currentTarget);
    const payload={matchId,name:form.get('name'),description:form.get('description')||undefined,priceMinor:Math.round(Number(form.get('price'))*100),currency:form.get('currency')||'USD',quantityTotal:Number(form.get('quantityTotal')),perOrderLimit:Number(form.get('perOrderLimit')||10),saleStartsAt:form.get('saleStartsAt')?new Date(String(form.get('saleStartsAt'))).toISOString():undefined,saleEndsAt:form.get('saleEndsAt')?new Date(String(form.get('saleEndsAt'))).toISOString():undefined,gate:form.get('gate')||undefined,section:form.get('section')||undefined};
    const response=await fetch(`${API_URL}/admin/tickets/products`,{method:'POST',credentials:'include',headers:headers(),body:JSON.stringify(payload)});
    const body=await response.json().catch(()=>({}));
    if(!response.ok){setError(Array.isArray(body.message)?body.message.join(', '):body.message||'Could not create ticket class');return}
    setNotice('Ticket class created');e.currentTarget.reset();
  };
  const markPaid=async(e:FormEvent)=>{
    e.preventDefault();setError('');setNotice('');
    const response=await fetch(`${API_URL}/admin/tickets/orders/${orderRef}/paid`,{method:'POST',credentials:'include',headers:headers(),body:JSON.stringify({paymentReference})});
    const body=await response.json().catch(()=>({}));
    if(!response.ok){setError(Array.isArray(body.message)?body.message.join(', '):body.message||'Could not mark paid');return}
    setNotice(`Payment confirmed. ${body.tickets?.length??0} ticket(s) issued.`);
  };
  const validate=async(e:FormEvent)=>{
    e.preventDefault();setError('');setNotice('');setValidation(null);
    const response=await fetch(`${API_URL}/admin/tickets/validate`,{method:'POST',credentials:'include',headers:headers(),body:JSON.stringify({ticketCode,device:'admin-web'})});
    const body=await response.json().catch(()=>({}));
    if(!response.ok){setError(Array.isArray(body.message)?body.message.join(', '):body.message||'Could not validate ticket');return}
    setValidation(body);setNotice(body.valid?'Ticket checked in':'Ticket is not valid for entry');
  };

  return <main className="page-shell ticket-shell">
    <Link href="/admin" className="back"><ArrowLeft/> Data administration</Link>
    <div className="directory-head"><span className="eyebrow">TICKETING OPERATIONS</span><h1>Fixture ticketing</h1><p>Create ticket classes, confirm manual payments, issue QR tickets and validate entry at the gate.</p></div>
    <div className="admin-warning"><Ticket/><span><b>Admin only</b>Use your ADMIN login. Optional API key works only when configured on the server.</span><label>Admin API key<input type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="Optional"/></label></div>
    {notice&&<div className="admin-notice"><CheckCircle2/>{notice}</div>}{error&&<div className="admin-error">{error}</div>}
    <section className="admin-ticket-panel"><h2>Create ticket class</h2><label>Fixture<select value={matchId} onChange={e=>setMatchId(e.target.value)}>{fixtures.map(f=><option value={f.id} key={f.id}>{f.homeTeam.name} v {f.awayTeam.name} · {formatDate(f.kickoffAt)}</option>)}</select></label>{selected&&<p className="ticket-note">{selected.season.competition.name} · {selected.round??selected.season.label} · {selected.venue?.name??selected.venueName??'Venue TBC'}</p>}<form onSubmit={submitProduct}><label>Name<input name="name" required placeholder="Grand Stand"/></label><label>Description<input name="description" placeholder="Covered seating"/></label><label>Price<input name="price" type="number" min="0" step="0.01" required defaultValue="5.00"/></label><label>Currency<select name="currency" defaultValue="USD"><option>USD</option><option>ZWL</option><option>ZAR</option></select></label><label>Total quantity<input name="quantityTotal" type="number" min="1" required defaultValue="1000"/></label><label>Limit/order<input name="perOrderLimit" type="number" min="1" defaultValue="10"/></label><label>Gate<input name="gate" placeholder="A"/></label><label>Section<input name="section" placeholder="Bay 4"/></label><label>Sale starts<input name="saleStartsAt" type="datetime-local"/></label><label>Sale ends<input name="saleEndsAt" type="datetime-local"/></label><button>Create ticket class</button></form></section>
    <section className="admin-ticket-panel"><h2>Current inventory</h2>{inventory?.products.length?inventory.products.map(product=><div className="ticket-line" key={product.id}><b>{product.name}<small>{product.gate?`Gate ${product.gate}`:'Gate TBC'}{product.section?` · ${product.section}`:''}</small></b><strong>{product.currency} {(product.priceMinor/100).toFixed(2)}</strong><small>{product.quantitySold}/{product.quantityTotal} sold · {product.available} left</small></div>):<div className="empty-state">No ticket classes for this fixture yet.</div>}</section>
    <div className="ticket-grid"><section className="admin-ticket-panel"><h2>Confirm payment</h2><form onSubmit={markPaid}><label>Order reference<input value={orderRef} onChange={e=>setOrderRef(e.target.value)} placeholder="TS-..." required/></label><label>Payment reference<input value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} placeholder="EcoCash / bank ref"/></label><button>Mark paid & issue tickets</button></form></section><section className="admin-ticket-panel"><h2><QrCode/> Validate ticket</h2><form className="ticket-validator" onSubmit={validate}><input value={ticketCode} onChange={e=>setTicketCode(e.target.value)} placeholder="Scan or paste ticket code" required/><button>Check in</button></form>{validation&&<p className="ticket-note">{validation.valid?'VALID ENTRY':'ENTRY BLOCKED'} · {validation.ticket?.product?.name??''} · {validation.reason??'Checked in'}</p>}</section></div>
  </main>;
}
