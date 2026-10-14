import { describe, expect, it } from 'vitest';
import { answerOnlyMarkup, renderAnkiTemplate } from './anki-template';

describe('safe Anki template rendering',()=>{
  it('renders arbitrary fields, static text and nested conditionals without executing markup',()=>{
    const rendered=renderAnkiTemplate('<p>Prompt: {{Prompt}}</p>{{#Italian}}<div>{{#Usage}}{{Usage}} — {{/Usage}}{{Italian}}</div>{{/Italian}}{{^Missing}}ready{{/Missing}}',{fields:{Prompt:'Say hello',Italian:'Ciao!',Usage:'Informal'},answerSide:false});
    expect(rendered.markup).toContain('Prompt: Say hello');
    expect(rendered.markup).toContain('Informal — Ciao!');
    expect(rendered.markup).toContain('ready');
    expect(rendered.referencedFields).toEqual(['Prompt','Italian','Usage','Missing']);
    expect(rendered.staticBlocks).toEqual(expect.arrayContaining([expect.objectContaining({tag:'p',text:'Prompt:'})]));
    expect(rendered.unsupported).toEqual([]);
  });
  it('accounts for meaningful literal template blocks without treating layout noise as content',()=>{
    const rendered=renderAnkiTemplate('<section><h2 class="category">DAY <em>OF THE</em> WEEK</h2><div class="accent">✦</div><p class="guidance">Say the answer aloud.</p><div>{{Prompt}}</div></section>',{fields:{Prompt:'Thursday'},answerSide:false});
    expect(rendered.staticBlocks).toEqual([
      {tag:'h2',text:'DAY OF THE WEEK',classes:['category']},
      {tag:'p',text:'Say the answer aloud.',classes:['guidance']},
    ]);
  });
  it('uses FrontSide and the answer boundary without duplicating the question',()=>{
    const template='{{FrontSide}}<hr id="answer"><b>Answer:</b> {{Italian}}<div>{{English}}</div>';
    const answerTemplate=answerOnlyMarkup(template);
    expect(answerTemplate).not.toContain('FrontSide');
    const rendered=renderAnkiTemplate(answerTemplate,{fields:{Italian:'Buonasera!',English:'Good evening'},frontSide:'Question',answerSide:true});
    expect(rendered.markup).toContain('Buonasera!');expect(rendered.markup).not.toContain('Question');
  });
  it('uses only the explicit Anki answer marker and retains internal dividers',()=>{
    const template='{{FrontSide}}<hr id="answer"><h2>{{Answer}}</h2><hr><table><tr><th>Form</th><th>Value</th></tr><tr><td>io</td><td>{{Form}}</td></tr></table>';
    const answer=answerOnlyMarkup(template);
    expect(answer).toContain('<hr>');
    expect(answer).toContain('{{Answer}}');
    expect(answer).not.toContain('FrontSide');
  });
  it('supports text and cloze filters and simplifies typed answers and TTS',()=>{
    expect(renderAnkiTemplate('{{text:Rich}}',{fields:{Rich:'<b>Hello</b>'},answerSide:false}).markup).toBe('Hello');
    expect(renderAnkiTemplate('{{cloze:Text}}',{fields:{Text:'{{c1::Ciao::greeting}}'},clozeOrdinal:1,answerSide:false}).markup).toBe('[greeting]');
    expect(renderAnkiTemplate('{{cloze:Text}}',{fields:{Text:'{{c1::Ciao::greeting}}'},clozeOrdinal:1,answerSide:true}).markup).toBe('Ciao');
    expect(renderAnkiTemplate('{{tts en_US:Italian}} {{type:Italian}}',{fields:{Italian:'Ciao'},answerSide:true}).simplifications).toEqual(['tts','typed-answer']);
  });
  it('never executes active template behavior and reports unknown filters',()=>{
    const rendered=renderAnkiTemplate('<script>globalThis.pwned=1</script>{{addon:Italian}}',{fields:{Italian:'Ciao'},answerSide:true});
    expect(rendered.unsupported).toEqual(['executable-template','filter:addon']);
    expect(rendered.markup).not.toContain('Ciao');
  });
  it('omits a narrowly proven metadata-only presentation script without executing it',()=>{
    const template='<div class="deck-label">{{Deck}}</div><div>{{Prompt}}</div><script>(function(){var e=document.querySelector(\'.deck-label\');if(!e)return;var p=e.textContent.split(/::|\\x1f/);if(p.length>1){var lesson=(p[0].match(/Lesson\\s+\\d+/i)||[\'Italian\'])[0];e.textContent=lesson+\' · \'+p[p.length-1];}})();</script>';
    const rendered=renderAnkiTemplate(template,{fields:{Prompt:'Introduce yourself'},special:{Deck:'Italian Lesson 1::Introductions'},answerSide:false});
    expect(rendered).toMatchObject({unsupported:[],simplifications:['presentation-script'],referencedFields:['Prompt']});
    expect(rendered.markup).toContain('Italian Lesson 1::Introductions');expect(rendered.markup).toContain('Introduce yourself');expect(rendered.markup).not.toContain('<script');
  });
  it('keeps learning-semantic and network scripts behind template review',()=>{
    const context={fields:{Prompt:'Question',Back:'Answer'},special:{Deck:'Science'},answerSide:false};
    expect(renderAnkiTemplate('<div class="answer">{{Back}}</div><script>var e=document.querySelector(\'.answer\');e.textContent=\'Generated answer\';</script>',context).unsupported).toContain('executable-template');
    expect(renderAnkiTemplate('<div class="deck-label">{{Deck}}</div>{{Prompt}}<script>fetch(\'https://example.test/answer\')</script>',context).unsupported).toContain('executable-template');
    expect(renderAnkiTemplate('<button onclick="reveal()">{{Prompt}}</button>',context).unsupported).toContain('executable-template');
    expect(renderAnkiTemplate('<div class="deck-label">{{Deck}}</div><script>var e=document.querySelector(\'.deck-label\');unknownFormatter(e);e.textContent=e.textContent;</script>',context).unsupported).toContain('executable-template');
  });
});
