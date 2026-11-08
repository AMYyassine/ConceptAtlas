import {useEffect,useRef,useState} from 'react';
import type {PlotData,Layout,PlotMouseEvent} from 'plotly.js';
import {useLab} from './LabContext';
import {loss,fmt} from './engine';
export default function Graph(){
 const {state,dispatch}=useLab(),el=useRef<HTMLDivElement>(null),lib=useRef<typeof import('plotly.js')|null>(null);
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[tangent,setTangent]=useState(false);
 const current=state.steps[state.cursor],previous=state.steps[state.cursor-1];
 useEffect(()=>{let cancelled=false;import('plotly.js-basic-dist-min').then(m=>{if(!cancelled){lib.current=m.default;setReady(true);}}).catch(()=>setFailed(true));return()=>{cancelled=true;if(el.current&&lib.current)lib.current.purge(el.current);};},[]);
 useEffect(()=>{
  if(!ready||!el.current||!lib.current)return;
  const visible=state.steps.slice(0,state.cursor+1);
  const ws=visible.map(x=>x.w),span=Math.max(5,...ws.map(x=>Math.abs(x-3)));
  const min=3-span*1.35,max=3+span*1.35;
  const xs=Array.from({length:241},(_,i)=>min+(max-min)*i/240),ys=xs.map(loss);
  const traces:Partial<PlotData>[]=[
   {x:xs,y:ys,type:'scatter',mode:'lines',line:{color:'#9aaeb7',width:2.5},hovertemplate:'w = %{x:.3f}<br>J(w) = %{y:.3f}<extra>Objective</extra>',showlegend:false},
   {x:visible.map(s=>s.w),y:visible.map(s=>s.loss),customdata:visible.map(s=>s.iteration),type:'scatter',mode:'lines+markers',line:{color:'#c6d4d8',width:1.5,dash:'dot'},marker:{size:8,color:'#8ea8ae',line:{width:2,color:'#fff'}},hovertemplate:'Step %{customdata}<br>w = %{x:.4f}<br>J(w) = %{y:.4f}<extra>Click to revisit</extra>',showlegend:false},
   {x:[3],y:[0],type:'scatter',mode:'markers',marker:{symbol:'diamond-open',size:11,color:'#82a49a',line:{width:2}},hovertemplate:'Minimum<br>w = 3, J(w) = 0<extra></extra>',showlegend:false},
   {x:[current.w],y:[current.loss],customdata:[current.iteration],type:'scatter',mode:'markers',marker:{size:15,color:'#177c72',line:{color:'#fff',width:3}},hovertemplate:'Selected step %{customdata}<br>w = %{x:.4f}<br>J(w) = %{y:.4f}<extra></extra>',showlegend:false}
  ];
  const base=previous??current;
  if(tangent){const dx=(max-min)*0.14;traces.push({x:[base.w-dx,base.w+dx],y:[base.loss-base.gradient*dx,base.loss+base.gradient*dx],type:'scatter',mode:'lines',line:{color:'#c98936',width:2,dash:'dash'},hovertemplate:'Slope at the start of the selected step<extra></extra>',showlegend:false});}
  const layout:Partial<Layout>={autosize:true,height:298,margin:{t:18,r:22,b:43,l:52},font:{family:'Inter, system-ui, sans-serif',size:11,color:'#6d7f84'},paper_bgcolor:'transparent',plot_bgcolor:'transparent',xaxis:{title:{text:'Parameter w',standoff:10},range:[min,max],gridcolor:'#eef1f1',zerolinecolor:'#e4e9e9',tickformat:'.3~g',fixedrange:false},yaxis:{title:{text:'Objective J(w)',standoff:10},gridcolor:'#eef1f1',zerolinecolor:'#e4e9e9',rangemode:'tozero',tickformat:'.3~g'},showlegend:false,hovermode:'closest',dragmode:'pan',shapes:[{type:'line',x0:current.w,x1:current.w,y0:0,y1:current.loss,line:{color:'#9bc8bd',width:1,dash:'dot'}}],annotations:previous?[{x:current.w,y:current.loss,ax:previous.w,ay:previous.loss,xref:'x',yref:'y',axref:'x',ayref:'y',text:'',showarrow:true,arrowhead:3,arrowsize:1.3,arrowwidth:2.5,arrowcolor:'#177c72',standoff:10,startstandoff:6}]:[],uirevision:`${state.revision}-${state.cursor}`};
  const plot=el.current as HTMLDivElement&{on?:(event:string,callback:(e:PlotMouseEvent)=>void)=>void;removeAllListeners?:(event:string)=>void};
  void lib.current.react(plot,traces,layout,{responsive:true,displayModeBar:false,scrollZoom:false}).then(()=>{
   plot.removeAllListeners?.('plotly_click');plot.on?.('plotly_click',(e)=>{const i=e.points[0]?.customdata;if(typeof i==='number')dispatch({type:'SELECT',cursor:i});});
  });
 },[state,ready,tangent,dispatch]);
 useEffect(()=>{if(!ready||!el.current)return;const ro=new ResizeObserver(()=>{if(el.current&&lib.current)void lib.current.Plots.resize(el.current);});ro.observe(el.current);return()=>ro.disconnect();},[ready]);
 return <><div className="plot" ref={el} role="img" aria-label={`Quadratic objective graph. Step ${state.cursor}: w ${fmt(current.w)}, objective ${fmt(current.loss)}.`}>{!ready&&<div className="plot-loading">{failed?'The graph could not load. The equation and history remain available.':'Drawing your experiment…'}</div>}</div><div className="graph-foot"><span><i className="legend-dot"/>Selected step <i className="legend-dot gray"/>History</span><label className="check-label"><input type="checkbox" checked={tangent} onChange={e=>setTangent(e.target.checked)}/>Show slope</label></div></>;
}
