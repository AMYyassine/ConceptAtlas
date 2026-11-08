export type Mode = 'free' | 'guided';
export type Focus = 'all' | 'graph' | 'math' | 'code' | 'table';
export interface Step { iteration:number; w:number; loss:number; gradient:number; rate:number|null; }
export interface LabState { steps:Step[]; cursor:number; rate:number; initial:number; mode:Mode; focus:Focus; revision:number; }
export const MAX_STEPS=150;
export const loss=(w:number)=>(w-3)**2;
export const gradient=(w:number)=>2*(w-3);
export const makeStep=(w:number,iteration:number,rate:number|null):Step=>({iteration,w,loss:loss(w),gradient:gradient(w),rate});
export const initialState=():LabState=>({steps:[makeStep(0,0,null)],cursor:0,rate:0.1,initial:0,mode:'free',focus:'all',revision:0});
export const presets={
  steady:{title:'Steady convergence',rate:0.1,initial:0,description:'Small steps toward the minimum.'},
  oscillate:{title:'Oscillating convergence',rate:0.8,initial:0,description:'Cross the minimum, then settle.'},
  diverge:{title:'Divergence',rate:1.1,initial:0,description:'Overshoot farther with every step.'}
};
export type Preset=keyof typeof presets;
export type Action={type:'NEXT'}|{type:'BACK'}|{type:'SELECT';cursor:number}|{type:'RATE';rate:number}|{type:'RESET';initial?:number}|{type:'PRESET';preset:Preset}|{type:'MODE';mode:Mode}|{type:'FOCUS';focus:Focus}|{type:'RESTORE';state:LabState};
export function stopReason(s:LabState):string|null {
 if(s.cursor<s.steps.length-1) return null;
 const current=s.steps[s.cursor];
 if(Math.abs(current.gradient)<1e-7) return 'The gradient is almost zero. You have reached the minimum.';
 if(s.cursor>=MAX_STEPS) return 'The 150-step demonstration limit is reached. Restart to explore again.';
 const next=current.w-s.rate*current.gradient;
 if(!Number.isFinite(next)||Math.abs(next)>1e5) return 'The trajectory is growing too large to display. Try a smaller learning rate.';
 return null;
}
export function reducer(s:LabState,a:Action):LabState {
 switch(a.type){
  case 'NEXT':{
   if(stopReason(s))return s;
   if(s.cursor<s.steps.length-1)return {...s,cursor:s.cursor+1,revision:s.revision+1};
   const prev=s.steps[s.cursor],next=makeStep(prev.w-s.rate*prev.gradient,prev.iteration+1,s.rate);
   return {...s,steps:[...s.steps,next],cursor:s.cursor+1,revision:s.revision+1};
  }
  case 'BACK':return s.cursor>0?{...s,cursor:s.cursor-1,revision:s.revision+1}:s;
  case 'SELECT':return Number.isInteger(a.cursor)&&a.cursor>=0&&a.cursor<s.steps.length?{...s,cursor:a.cursor,revision:s.revision+1}:s;
  case 'RATE':return Number.isFinite(a.rate)&&a.rate>=0.01&&a.rate<=1.5&&a.rate!==s.rate?{...s,rate:a.rate,steps:s.steps.slice(0,s.cursor+1),revision:s.revision+1}:s;
  case 'RESET':{
   const w=a.initial??s.initial;if(!Number.isFinite(w)||w< -6||w>12)return s;
   return {...s,steps:[makeStep(w,0,null)],cursor:0,initial:w,revision:s.revision+1};
  }
  case 'PRESET':{const p=presets[a.preset];return {...s,steps:[makeStep(p.initial,0,null)],cursor:0,rate:p.rate,initial:p.initial,revision:s.revision+1};}
  case 'MODE':return {...s,mode:a.mode};
  case 'FOCUS':return {...s,focus:a.focus};
  case 'RESTORE':return {...a.state,revision:s.revision+1};
 }
}
export const fmt=(n:number,digits=4)=>Math.abs(n)<1e-10?'0':Math.abs(n)>=1e5?n.toExponential(3):Number(n.toFixed(digits)).toLocaleString('en-US',{maximumFractionDigits:digits});
export function behavior(rate:number){return rate<0.5?'Steady convergence':rate===0.5?'One-step convergence':rate<1?'Oscillating convergence':rate===1?'Persistent oscillation':'Divergence';}
export function explainStep(s:LabState):{title:string;body:string;detail:string}{
 const current=s.steps[s.cursor],before=s.steps[s.cursor-1];
 if(!before)return {title:Math.abs(current.gradient)<1e-7?'Already at the minimum':'Start with the slope',body:`At w = ${fmt(current.w)}, the gradient is ${fmt(current.gradient)}. ${current.gradient<0?'A negative gradient makes gradient descent increase w.':current.gradient>0?'A positive gradient makes gradient descent decrease w.':'A zero gradient gives a zero update.'}`,detail:'The horizontal axis is the parameter w. The vertical axis is the objective J(w). Select Next iteration to connect one update across every view.'};
 const change=current.loss-before.loss, crossed=(current.w-3)*(before.w-3)<0;
 return {title:Math.abs(change)<1e-9?'A step without a lower objective':change>0?'This step increased the objective':crossed?'Across the minimum, but closer':'One update, four perspectives',body:`The gradient at w = ${fmt(before.w)} was ${fmt(before.gradient)}. Subtracting ${fmt(current.rate!)} × (${fmt(before.gradient)}) moved w to ${fmt(current.w)}. The objective ${Math.abs(change)<1e-9?'stayed at':change<0?'fell from':'rose from'} ${fmt(before.loss)}${Math.abs(change)<1e-9?'':` to ${fmt(current.loss)}`}.`,detail:Math.abs(change)<1e-9?'This step did not lower the objective. For this quadratic, a learning rate of 1 gives persistent oscillation unless the point starts at the minimum.':change>0?'The update crossed too far beyond the minimum. For this quadratic, a learning rate above 1 makes the distance to the minimum grow.':crossed?'Crossing the minimum does not automatically mean divergence. Here, the distance to w = 3 and the objective both decreased.':'Compare the graph’s highlighted point with the same w in the equation, code, and history. They describe one computed state.'};
}
export function snapshot(s:LabState){const c=s.steps[s.cursor],p=s.steps[s.cursor-1];return {iteration:c.iteration,w:c.w,loss:c.loss,gradient:c.gradient,previous_w:p?.w??null,previous_loss:p?.loss??null,applied_gradient:p?.gradient??null,step_rate:c.rate,next_rate:s.rate,mode:s.mode};}
export function serialize(s:LabState){return JSON.stringify({schema:'conceptatlas.session.v1',initial:s.initial,rate:s.rate,cursor:s.cursor,mode:s.mode,steps:s.steps.map(x=>({w:x.w,rate:x.rate}))},null,2);}
export function restore(raw:string):LabState{
 const d=JSON.parse(raw);
 if(d.schema!=='conceptatlas.session.v1'||!Number.isFinite(d.initial)||d.initial< -6||d.initial>12||!Number.isFinite(d.rate)||d.rate<0.01||d.rate>1.5||!['free','guided'].includes(d.mode)||!Array.isArray(d.steps)||!d.steps.length||d.steps.length>MAX_STEPS+1||!Number.isInteger(d.cursor)||d.cursor<0||d.cursor>=d.steps.length)throw new Error('This file is not a valid ConceptAtlas V1 session.');
 const steps:Step[]=[];
 for(let i=0;i<d.steps.length;i++){
  const item=d.steps[i],r=item.rate;
  if(!Number.isFinite(item.w)||Math.abs(item.w)>1e5||(i===0&&(item.w!==d.initial||r!==null))||(i>0&&(!Number.isFinite(r)||r<0.01||r>1.5)))throw new Error('The session contains invalid values.');
  const expected=i===0?d.initial:steps[i-1].w-r*steps[i-1].gradient;
  if(Math.abs(item.w-expected)>1e-7*Math.max(1,Math.abs(expected)))throw new Error('The session contains an inconsistent calculation.');
  steps.push(makeStep(expected,i,r));
 }
 return {...initialState(),steps,cursor:d.cursor,initial:d.initial,rate:d.rate,mode:d.mode};
}
