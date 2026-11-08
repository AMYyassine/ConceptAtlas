export type Representation='visual'|'math'|'code'|'intuition'|'example'|'practice'|'general';
export interface Dimension {id:string;name:string;description:string;values:string[]}
export interface LearningCard {id:string;title:string;keywords:string[];summary:string;body:string;attributes:Record<string,string>;representation:Representation}
export interface Space {id:string;prompt:string;title:string;description:string;dimensions:Dimension[];cards:LearningCard[];module:'none'|'gradient_descent';source:'ai'|'prepared'|'mixed';notes:string;bookmarks:string[];selected:string|null}
export interface Camera {x:number;y:number;z:number}
export const colors=['#7789b9','#64a89a','#cb9e66','#bd83a9','#849dc7','#b2a25b'];
export const semanticNames=['Dots','Titles','Keywords','Summaries','Full explanations'];
export const levelZoom=[.3,.6,.95,1.4,2.1];
export function semanticLevel(z:number){return z<.45?0:z<.8?1:z<1.15?2:z<1.8?3:4;}
export function zoomAt(camera:Camera,point:{x:number;y:number},newZoom:number):Camera {
 const z=Math.max(.18,Math.min(3.5,newZoom));return {x:point.x-(point.x-camera.x)*z/camera.z,y:point.y-(point.y-camera.y)*z/camera.z,z};
}
export function cardMatches(card:LearningCard,filters:Record<string,string>,query:string,onlySaved:boolean,bookmarks:string[]){
 return (!onlySaved||bookmarks.includes(card.id))&&Object.entries(filters).every(([id,v])=>!v||card.attributes[id]===v)&&(!query.trim()||`${card.title} ${card.summary} ${card.body} ${card.keywords.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
}
export function layoutCards(cards:LearningCard[],dimensions:Dimension[],xId:string,yId:string){
 const xd=dimensions.find(d=>d.id===xId),yd=dimensions.find(d=>d.id===yId);
 const positions:Record<string,{x:number;y:number}>={},buckets:Record<string,LearningCard[]>={};
 cards.forEach((c)=>{const x=xd?Math.max(0,xd.values.indexOf(c.attributes[xd.id])):0,y=yd?Math.max(0,yd.values.indexOf(c.attributes[yd.id])):0;const k=`${x}:${y}`;(buckets[k]??=[]).push(c);});
 const largest=Math.max(1,...Object.values(buckets).map(b=>b.length));
 const cells=Math.ceil(Math.sqrt(largest));const dx=Math.max(430,cells*330),dy=Math.max(350,cells*320);
 const xLabels=xd?xd.values.map((name,i)=>({name,position:i*dx+dx/2})):[];
 const yLabels=yd?yd.values.map((name,i)=>({name,position:i*dy+dy/2})):[];
 for(const [key,list] of Object.entries(buckets)){
  const [col,row]=key.split(':').map(Number),n=Math.ceil(Math.sqrt(list.length));
  list.forEach((c,i)=>{if(!xd&&!yd){const angle=i*2.399963229728653,r=150*Math.sqrt(i);positions[c.id]={x:800+Math.cos(angle)*r,y:600+Math.sin(angle)*r};}
   else positions[c.id]={x:col*dx+dx/2+(i%n-(n-1)/2)*330,y:row*dy+dy/2+(Math.floor(i/n)-(Math.ceil(list.length/n)-1)/2)*310};});
 }
 const ps=Object.values(positions);const minX=Math.min(0,...ps.map(p=>p.x-180)),minY=Math.min(0,...ps.map(p=>p.y-160));
 return {positions,xLabels,yLabels,width:Math.max(xd?xd.values.length*dx:0,...ps.map(p=>p.x+180),400)-minX,height:Math.max(yd?yd.values.length*dy:0,...ps.map(p=>p.y+160),300)-minY,minX,minY};
}
export function validateSpace(value:unknown):Space {
 const s=value as Space;
 if(!s||typeof s.id!=='string'||typeof s.prompt!=='string'||typeof s.title!=='string'||typeof s.description!=='string'||!['none','gradient_descent'].includes(s.module)||!['ai','prepared','mixed'].includes(s.source)||!Array.isArray(s.dimensions)||s.dimensions.length<1||s.dimensions.length>8||!Array.isArray(s.cards)||s.cards.length>80)throw new Error('Invalid learning space.');
 const ids=new Set<string>();for(const d of s.dimensions){if(!d||typeof d.id!=='string'||ids.has(d.id)||typeof d.name!=='string'||typeof d.description!=='string'||!Array.isArray(d.values)||d.values.length<2||d.values.length>8||d.values.some(v=>typeof v!=='string')||new Set(d.values).size!==d.values.length)throw new Error('Invalid dimensions.');ids.add(d.id);}
 const cards=new Set<string>();for(const c of s.cards){if(!c||typeof c.id!=='string'||cards.has(c.id)||typeof c.title!=='string'||typeof c.summary!=='string'||typeof c.body!=='string'||c.body.length>20000||!Array.isArray(c.keywords)||c.keywords.some(k=>typeof k!=='string')||!['visual','math','code','intuition','example','practice','general'].includes(c.representation)||!c.attributes||s.dimensions.some(d=>!d.values.includes(c.attributes[d.id])))throw new Error('Invalid explanation or dimension assignment.');cards.add(c.id);}
 return {...s,notes:typeof s.notes==='string'?s.notes:'',bookmarks:Array.isArray(s.bookmarks)?s.bookmarks.filter(id=>cards.has(id)):[],selected:cards.has(s.selected??'')?s.selected:null};
}
