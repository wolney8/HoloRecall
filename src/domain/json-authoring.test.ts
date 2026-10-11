import { describe, expect, it } from 'vitest';
import { JSON_AUTHORING_EXAMPLE, previewJsonAuthoring } from './json-authoring';
import type { Deck } from './models';

const deck:Deck={id:'maths',name:'Maths',description:'',suspended:false,designSetId:'technical'};
describe('content-first JSON authoring',()=>{
  it('normalises friendly JSON without copying the deck design onto every card',()=>{
    const preview=previewJsonAuthoring(JSON.stringify(JSON_AUTHORING_EXAMPLE.cards),deck,()=> 'one');
    expect(preview).toMatchObject({valid:true,errors:[],cards:[{id:'card-one',deckId:'maths',front:'Solve 7 × 8',answer:'56',secondary:'Multiplication fact',rarity:'common'}]});
    expect(preview.cards[0]!.designSetId).toBeUndefined();
  });
  it('accepts the official versioned schema and reports per-card errors atomically',()=>{
    const input={...JSON_AUTHORING_EXAMPLE,cards:[JSON_AUTHORING_EXAMPLE.cards[0],{front:'Unsafe',answer:'<img onerror="alert(1)">'}]};
    let sequence=0;const preview=previewJsonAuthoring(JSON.stringify(input),deck,()=> `id-${++sequence}`);
    expect(preview.valid).toBe(false);expect(preview.cards).toHaveLength(1);expect(preview.errors).toEqual([{index:1,message:expect.stringContaining('plain learning text')}]);
  });
  it('rejects unsupported properties instead of silently treating them as executable presentation',()=>{
    const preview=previewJsonAuthoring(JSON.stringify([{front:'Question',answer:'Answer',html:'<b>style</b>'}]),deck,()=> 'one');
    expect(preview).toMatchObject({valid:false,errors:[{index:0,message:'Unknown property "html".'}]});
  });
});
