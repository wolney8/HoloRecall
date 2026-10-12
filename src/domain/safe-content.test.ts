import {describe,expect,it} from 'vitest';
import {safeContentBlocks} from './safe-content';

describe('safe imported support content',()=>{
  it('retains headings, lists, tables and code as inert declarative blocks',()=>{
    const blocks=safeContentBlocks('<script>bad()</script><h3>Forms</h3><ul><li>io sono</li><li>Lei è</li></ul><table><tr><th>Person</th><th>Form</th></tr><tr><td>Lei</td><td>è</td></tr></table><pre>6 × 7 = 42</pre>');
    expect(blocks).toEqual(expect.arrayContaining([
      {type:'heading',text:'Forms',level:3},
      {type:'list',ordered:false,items:['io sono','Lei è']},
      {type:'table',headers:['Person','Form'],rows:[['Lei','è']]},
      {type:'code',text:'6 × 7 = 42'},
    ]));
    expect(JSON.stringify(blocks)).not.toContain('bad()');
  });
  it('removes event handlers and remote executable references while preserving text',()=>{
    expect(safeContentBlocks('<p onclick="bad()">Useful <a href="javascript:bad()">detail</a></p>')).toEqual([{type:'paragraph',text:'Useful detail'}]);
  });
  it('preserves nested block boundaries inside table cells',()=>{
    expect(safeContentBlocks('<table><tr><th>Italian</th></tr><tr><td><div>io sono</div><div>EE-oh SOH-noh</div></td></tr></table>')).toEqual([{type:'table',headers:['Italian'],rows:[['io sono\nEE-oh SOH-noh']]}]);
  });
});

describe('semantic relationship blocks',()=>{
  it('preserves source term/role tiles as one inert relationship group',()=>{
    expect(safeContentBlocks('<div class="tiles"><div class="word-tile"><span>lui</span><small>subject pronoun</small></div><div class="word-tile"><span>è</span><small>verb</small></div></div>')).toContainEqual({type:'pairs',rows:[{term:'lui',description:'subject pronoun'},{term:'è',description:'verb'}]});
  });
});
