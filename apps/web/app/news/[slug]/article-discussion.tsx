'use client';

import { MessageCircle, ThumbsDown, ThumbsUp } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { API_URL } from '@/lib/api';

type Comment={id:string;body:string;createdAt:string;user:{username?:string;displayName:string;role:string}};
type Discussion={likes:number;dislikes:number;comments:Comment[]};

export function ArticleDiscussion({slug,initialLikes=0,initialDislikes=0}:{slug:string;initialLikes?:number;initialDislikes?:number}){
  const [discussion,setDiscussion]=useState<Discussion>({likes:initialLikes,dislikes:initialDislikes,comments:[]});
  const [body,setBody]=useState('');
  const [error,setError]=useState('');
  const load=()=>fetch(`${API_URL}/articles/${slug}/discussion`,{credentials:'include'}).then(r=>r.json()).then(setDiscussion).catch(()=>{});
  useEffect(()=>{load()},[slug]);
  const react=async(value:1|-1)=>{setError('');const response=await fetch(`${API_URL}/articles/${slug}/reactions`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({value})});const data=await response.json().catch(()=>({}));if(!response.ok){setError(data.message||'Sign in to react');return}setDiscussion(data)};
  const comment=async(e:FormEvent)=>{e.preventDefault();setError('');const response=await fetch(`${API_URL}/articles/${slug}/comments`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({body})});const data=await response.json().catch(()=>({}));if(!response.ok){setError(data.message||'Sign in to comment');return}setDiscussion(data);setBody('')};
  return <section className="article-discussion"><div className="reaction-row"><button onClick={()=>react(1)}><ThumbsUp/> Like <b>{discussion.likes}</b></button><button onClick={()=>react(-1)}><ThumbsDown/> Dislike <b>{discussion.dislikes}</b></button></div><form onSubmit={comment} className="comment-form"><label><MessageCircle/> Comment<textarea required minLength={2} maxLength={1200} value={body} onChange={e=>setBody(e.target.value)} placeholder="Add your view on the analysis…"/></label><button>Post comment</button></form>{error&&<div className="admin-error">{error}</div>}<div className="comment-list">{discussion.comments.map(comment=><article key={comment.id}><b>@{comment.user.username||comment.user.displayName}<small>{comment.user.role} · {new Date(comment.createdAt).toLocaleDateString('en-ZW')}</small></b><p>{comment.body}</p></article>)}{!discussion.comments.length&&<p className="comment-empty">No comments yet. Start the discussion.</p>}</div></section>;
}
