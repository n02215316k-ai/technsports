'use client';
import { useEffect, useState } from 'react';
export const API_URL=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000/api/v1';
export function useApi<T>(path:string|null){const [data,setData]=useState<T|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(Boolean(path));useEffect(()=>{if(!path){setLoading(false);return}const controller=new AbortController();setLoading(true);fetch(`${API_URL}${path}`,{signal:controller.signal,credentials:'include'}).then(async response=>{if(!response.ok)throw new Error((await response.json().catch(()=>null))?.message||`Request failed (${response.status})`);return response.json()}).then(setData).catch(reason=>{if(reason.name!=='AbortError')setError(reason.message)}).finally(()=>setLoading(false));return()=>controller.abort()},[path]);return{data,error,loading}}
export const initials=(name:string)=>name.split(/\s+/).map(part=>part[0]).join('').slice(0,3).toUpperCase();
export const formatDate=(value:string)=>new Date(value).toLocaleDateString('en-ZW',{day:'2-digit',month:'short',year:'numeric'});
