import {describe,expect,it} from 'vitest';
import {initialState,reducer,stopReason,snapshot,serialize,restore,explainStep,MAX_STEPS,type LabState} from './engine';

const advance=(s:LabState,n=1)=>{for(let i=0;i<n;i++)s=reducer(s,{type:'NEXT'});return s;};
describe('synchronized gradient descent state',()=>{
 it('calculates the first two updates from the applied gradient',()=>{
  const s=advance(initialState(),2);
  expect(s.steps[1].w).toBeCloseTo(.6,12);
  expect(s.steps[1].loss).toBeCloseTo(5.76,12);
  expect(s.steps[2].w).toBeCloseTo(1.08,12);
  expect(s.steps[2].loss).toBeCloseTo(3.6864,12);
  expect(s.steps[2].gradient).toBeCloseTo(-3.84,12);
 });
 it('distinguishes oscillating convergence from divergence',()=>{
  const s=advance(reducer(initialState(),{type:'PRESET',preset:'oscillate'}),2);
  expect(s.steps[1].w).toBeCloseTo(4.8);
  expect(s.steps[2].w).toBeCloseTo(1.92);
  expect(s.steps[2].loss).toBeLessThan(s.steps[1].loss);
  expect(explainStep(s).title).toBe('Across the minimum, but closer');
 });
 it('recognizes divergence and its increased objective',()=>{
  const s=advance(reducer(initialState(),{type:'PRESET',preset:'diverge'}));
  expect(s.steps[1].w).toBeCloseTo(6.6);
  expect(s.steps[1].loss).toBeCloseTo(12.96);
  expect(explainStep(s).body).toContain('rose from 9 to 12.96');
 });
 it('does not describe equal-height oscillation as an improvement',()=>{
  const s=advance(reducer(initialState(),{type:'RATE',rate:1}));
  expect(s.steps[1].w).toBe(6);
  expect(s.steps[1].loss).toBe(9);
  expect(explainStep(s).detail).not.toContain('both decreased');
  expect(explainStep(s).body).toContain('stayed at 9');
 });
 it('stops immediately at the minimum, including with a large rate',()=>{
  const s=reducer(reducer(initialState(),{type:'RATE',rate:1.5}),{type:'RESET',initial:3});
  expect(stopReason(s)).toContain('minimum');
  expect(advance(s)).toBe(s);
 });
 it('reaches the minimum in one update with rate 0.5',()=>{
  const s=advance(reducer(initialState(),{type:'RATE',rate:.5}));
  expect(s.steps[1].w).toBe(3);
  expect(stopReason(s)).toContain('minimum');
 });
 it('replays recorded steps without creating duplicates',()=>{
  const end=advance(initialState(),3);
  const back=reducer(end,{type:'BACK'});
  expect(advance(back).steps).toBe(end.steps);
  expect(advance(back).cursor).toBe(3);
 });
 it('branches from a reviewed step when the learning rate changes',()=>{
  const end=advance(initialState(),4);
  const reviewed=reducer(end,{type:'SELECT',cursor:1});
  const changed=reducer(reviewed,{type:'RATE',rate:.8});
  expect(changed.steps).toHaveLength(2);
  expect(changed.steps[1]).toEqual(end.steps[1]);
  const next=advance(changed);
  expect(next.steps[2].w).toBeCloseTo(4.44);
  expect(next.steps[2].rate).toBe(.8);
 });
 it('keeps the applied rate and gradient distinct from the current ones',()=>{
  const s=reducer(advance(initialState()),{type:'RATE',rate:.8});
  expect(snapshot(s)).toMatchObject({previous_w:0,applied_gradient:-6,step_rate:.1,next_rate:.8});
  expect(snapshot(s).gradient).toBeCloseTo(-4.8);
 });
 it('limits long trajectories and prevents values beyond the display range',()=>{
  const slow=advance(reducer(initialState(),{type:'RATE',rate:.01}),200);
  expect(slow.cursor).toBe(MAX_STEPS);
  const growing=advance(reducer(initialState(),{type:'RATE',rate:1.5}),200);
  expect(stopReason(growing)).toContain('too large');
  expect(growing.steps.every(s=>Number.isFinite(s.loss)&&Math.abs(s.w)<=1e5)).toBe(true);
 });
 it('rejects invalid settings',()=>{
  const s=initialState();
  for(const rate of [NaN,Infinity,-1,0,1.51])expect(reducer(s,{type:'RATE',rate})).toBe(s);
  expect(reducer(s,{type:'RESET',initial:Infinity})).toBe(s);
  expect(reducer(s,{type:'SELECT',cursor:99})).toBe(s);
 });
 it('restores a session by recomputing its complete trajectory',()=>{
  const s=reducer(advance(initialState(),3),{type:'SELECT',cursor:1});
  const restored=restore(serialize(s));
  expect(restored.steps).toEqual(s.steps);
  expect(restored.cursor).toBe(1);
 });
 it('rejects tampered imported calculations',()=>{
  const d=JSON.parse(serialize(advance(initialState())));
  d.steps[1].w=99;
  expect(()=>restore(JSON.stringify(d))).toThrow('inconsistent calculation');
  d.steps[1].rate=-1;
  expect(()=>restore(JSON.stringify(d))).toThrow('invalid values');
 });
});
