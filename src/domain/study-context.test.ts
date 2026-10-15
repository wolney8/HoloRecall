import {describe,expect,it} from 'vitest';
import type {Deck} from './models';
import {cleanStudyDeckTopic,conciseStudyContext} from './study-context';

const decks:Deck[]=[
  {id:'lesson-1',name:'Italian - Lesson 1 - Introductions - v5.1 Case Corrected',description:'',suspended:false},
  {id:'greetings',parentId:'lesson-1',name:'01 Greetings & farewells',description:'',suspended:false},
  {id:'lesson-2',name:'Italian - Lesson 2 - Alphabet, C-G Sounds & Articles - 29 September 2026',description:'',suspended:false},
  {id:'gender',parentId:'lesson-2',name:'05 Gender, number & definite articles',description:'',suspended:false},
  {id:'lesson-3',name:'Italian - Lesson 3 - Descriptions and people - 1 October 2026',description:'',suspended:false},
  {id:'people',parentId:'lesson-3',name:'03 Describing people',description:'',suspended:false},
  {id:'plain',name:'bBarryy anatomy thorax pt 1',description:'',suspended:false},
];

describe('concise Study context',()=>{
  it('uses lesson number with the cleaned leaf topic',()=>expect(conciseStudyContext(decks,'gender')).toBe('Lesson 2 · Gender, number & definite articles'));
  it('uses the concise parent subject when the lesson parent is the Study scope',()=>expect(conciseStudyContext(decks,'gender','lesson-2')).toBe('Lesson 2 · Alphabet, C-G Sounds & Articles'));
  it('removes source-package version noise from a lesson parent scope',()=>expect(conciseStudyContext(decks,'greetings','lesson-1')).toBe('Lesson 1 · Introductions'));
  it.each([
    ['Italian - Lesson 2 - Alphabet, C-G Sounds & Articles - 29 September 2026\n05 Gender, number & definite articles'],
    ['Italian - Lesson 2 - Alphabet, C-G Sounds & Articles - 29 September 2026::05 - Gender, number & definite articles'],
    ['Italian - Lesson 2 - Alphabet, C-G Sounds & Articles - 29 September 2026 05. Gender, number & definite articles'],
  ])('prefers an embedded leaf after middle-of-hierarchy date noise: %s',name=>{
    const combined:Deck={id:'combined',name,description:'',suspended:false};
    expect(conciseStudyContext([combined],'combined')).toBe('Lesson 2 · Gender, number & definite articles');
  });
  it.each([
    ['greetings','Lesson 1 · Greetings & farewells'],
    ['people','Lesson 3 · Describing people'],
  ])('derives course context for %s without subject-specific rules',(deckId,expected)=>expect(conciseStudyContext(decks,deckId)).toBe(expected));
  it('keeps a generic non-course leaf name',()=>expect(conciseStudyContext(decks,'plain')).toBe('bBarryy anatomy thorax pt 1'));
  it('removes control characters, ordering prefixes and date clutter',()=>expect(cleanStudyDeckTopic(' 05.  Gender\u0000 agreement — 29 September 2026 ')).toBe('Gender agreement'));
  it('does not invent a lesson for an unrelated scope',()=>expect(conciseStudyContext(decks,'plain','lesson-2')).toBe('bBarryy anatomy thorax pt 1'));
});
