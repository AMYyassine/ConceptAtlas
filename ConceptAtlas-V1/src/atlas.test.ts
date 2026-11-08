import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {cardMatches,layoutCards,semanticLevel,zoomAt,validateSpace} from './atlas';
import {preparedGradient} from './prepared';
import {Formula,RichText} from './Content';

describe('educational exploration model',()=>{
 it('provides a valid prepared space without labeling it AI-generated',()=>{const s=validateSpace(preparedGradient());expect(s.source).toBe('prepared');expect(s.cards).toHaveLength(12);expect(s.dimensions).toHaveLength(3);});
 it('changes representation as semantic zoom increases',()=>{expect([.3,.6,.95,1.4,2.1].map(semanticLevel)).toEqual([0,1,2,3,4]);});
 it('keeps the world point under the pointer fixed during zoom',()=>{const c={x:20,y:-10,z:.5},p={x:300,y:200},n=zoomAt(c,p,1.5);expect((p.x-n.x)/n.z).toBe((p.x-c.x)/c.z);expect((p.y-n.y)/n.z).toBe((p.y-c.y)/c.z);});
 it('limits zoom to a usable range',()=>{expect(zoomAt({x:0,y:0,z:1},{x:0,y:0},99).z).toBe(3.5);expect(zoomAt({x:0,y:0,z:1},{x:0,y:0},0).z).toBe(.18);});
 it('groups cards according to the selected two dimensions',()=>{const s=preparedGradient(),l=layoutCards(s.cards,s.dimensions,'perspective','depth');expect(l.positions[s.cards[0].id].x).toBe(l.positions[s.cards[1].id].x);expect(l.positions[s.cards[0].id].y).not.toBe(l.positions[s.cards[1].id].y);expect(l.positions[s.cards[0].id].x).not.toBe(l.positions[s.cards[3].id].x);});
 it('allocates distinct positions to cards sharing the same dimensional values',()=>{const s=preparedGradient(),c={...s.cards[0],id:'new'};const l=layoutCards([...s.cards,c],s.dimensions,'perspective','depth');expect(l.positions[c.id]).not.toEqual(l.positions[s.cards[0].id]);});
 it('combines text, dimension and bookmark filters',()=>{const s=preparedGradient(),c=s.cards[0];expect(cardMatches(c,{perspective:'Visual'},'slope',true,[c.id])).toBe(true);expect(cardMatches(c,{perspective:'Mathematical'},'slope',true,[c.id])).toBe(false);expect(cardMatches(c,{},'',true,[])).toBe(false);});
 it('rejects invented dimension values in imported explanations',()=>{const s=preparedGradient();s.cards[0].attributes.perspective='Unknown';expect(()=>validateSpace(s)).toThrow('Invalid explanation');});
 it('rejects duplicate dimension identifiers and card identifiers',()=>{const s=preparedGradient();s.dimensions[1].id=s.dimensions[0].id;expect(()=>validateSpace(s)).toThrow('Invalid dimensions');const t=preparedGradient();t.cards[1].id=t.cards[0].id;expect(()=>validateSpace(t)).toThrow('Invalid explanation');});
 it('renders mathematical notation and escapes generated HTML',()=>{const math=renderToStaticMarkup(createElement(Formula,{text:"w_{t+1}=w_t-\\eta J'(w_t)"}));expect(math).not.toContain('katex-error');const text=renderToStaticMarkup(createElement(RichText,{text:'<script>alert(1)</script>'}));expect(text).toContain('&lt;script&gt;');expect(text).not.toContain('<script>');});
});
