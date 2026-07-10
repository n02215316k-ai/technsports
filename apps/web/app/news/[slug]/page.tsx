import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { ArticleDiscussion } from './article-discussion';

type Article={slug:string;title:string;excerpt:string;category:string;authorName:string;coverImageUrl?:string;publishedAt?:string;body:{text?:string};source?:string;likes?:number;dislikes?:number;authorUser?:{username?:string;displayName:string;role:string};match?:{id:string;homeTeam:{name:string};awayTeam:{name:string};season:{label:string;competition:{name:string}};venue?:{name:string}}};

export default async function ArticlePage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const api=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000/api/v1';
  let article:Article|null=null;
  try{const response=await fetch(`${api}/public/articles/${slug}`,{cache:'no-store'});if(response.ok)article=await response.json()}catch{}
  if(!article)notFound();
  const paragraphs=article.body?.text?.split(/\n\n+/).filter(Boolean)??[];
  const author=article.authorUser?`@${article.authorUser.username||article.authorUser.displayName}`:article.authorName;
  return <main className="article-page">
    <Link href="/news" className="back"><ArrowLeft/> All news</Link>
    <span className="eyebrow">{article.category}</span>
    <h1>{article.title}</h1>
    <div className="article-meta">{author} · {new Date(article.publishedAt??Date.now()).toLocaleDateString('en-ZW')} · {Math.max(1,Math.ceil(paragraphs.join(' ').split(/\s+/).length/200))} min read</div>
    {article.match&&<div className="article-match-strip"><b>{article.match.homeTeam.name} v {article.match.awayTeam.name}</b><span>{article.match.season.competition.name} · {article.match.season.label}</span></div>}
    {article.coverImageUrl&&<div className="article-lead" style={{backgroundImage:`url(${article.coverImageUrl})`,backgroundSize:'cover',backgroundPosition:'center'}}/>}
    <article><p className="standfirst">{article.excerpt}</p>{paragraphs.map((paragraph,index)=><p key={index}>{paragraph}</p>)}</article>
    <ArticleDiscussion slug={slug} initialLikes={article.likes??0} initialDislikes={article.dislikes??0}/>
  </main>;
}
