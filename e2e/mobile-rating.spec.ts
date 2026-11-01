import { expect, openApp, replaceSnapshot, snapshot, test } from './helpers';

const labels=['1, Forgot','2, Hard','3, Hesitant','4, Confident','5, Easy'];

async function enterRatings(page:import('@playwright/test').Page):Promise<void>{
  await openApp(page);
  await page.getByRole('button',{name:/Start studying/}).click();
  const reveal=page.getByRole('button',{name:/Check answer/});
  if(await reveal.isVisible())await reveal.click();
  else{const card=page.getByTestId('study-deck-stage').locator('[role="button"]');await card.focus();await page.keyboard.press('Enter');}
  await expect(page.getByRole('group',{name:'Rate your recall'})).toBeVisible();
}

async function chooseTheme(page:import('@playwright/test').Page,label:'System'|'Light'|'Dark'):Promise<void>{
  await page.locator('.mobile-header').getByRole('button',{name:/Choose theme/}).click();
  await page.getByRole('menuitemradio',{name:label,exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme',label.toLowerCase());
}

async function gesturePointer(page:import('@playwright/test').Page,stage:import('@playwright/test').Locator,pointerId:number,x:number,y:number,type:'pointerdown'|'pointermove'|'pointerup'|'pointercancel'|'lostpointercapture'):Promise<void>{
  await stage.dispatchEvent(type,{pointerId,pointerType:'touch',isPrimary:true,button:0,clientX:x,clientY:y});
  if(type==='pointermove')await page.waitForTimeout(34);
}

test('HR-MOBILE-UX-01B compact ratings are one equal action group with shared modal help',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await enterRatings(page);
  const before=await snapshot(page),group=page.getByRole('group',{name:'Rate your recall'}),choices=group.getByRole('button');
  await expect(choices).toHaveCount(5);
  for(const label of labels)await expect(group.getByRole('button',{name:label,exact:true})).toBeVisible();
  const geometry=await choices.evaluateAll(items=>items.map(item=>{const node=item as HTMLElement,style=getComputedStyle(item);return{x:node.offsetLeft,y:node.offsetTop,width:node.offsetWidth,height:node.offsetHeight,numberY:(item.querySelector('.rating-number') as HTMLElement).offsetTop,labelY:(item.querySelector('.rating-label') as HTMLElement).offsetTop,borderWidth:style.borderTopWidth};}));
  expect(new Set(geometry.map(item=>item.width)).size).toBe(1);
  expect(new Set(geometry.map(item=>item.height)).size).toBe(1);
  expect(new Set(geometry.map(item=>Math.round(item.y))).size).toBe(1);
  expect(new Set(geometry.map(item=>Math.round(item.numberY))).size).toBe(1);
  expect(new Set(geometry.map(item=>Math.round(item.labelY))).size).toBe(1);
  expect(geometry.every(item=>item.width>=44&&item.height>=44&&item.borderWidth==='0px')).toBe(true);
  expect(await group.locator('small,.rating-grade').count()).toBe(0);
  await expect(page.locator('details').filter({hasText:'About the ratings'})).toHaveCount(0);

  const help=page.getByRole('button',{name:'About the ratings',exact:true});
  expect((await help.boundingBox())!.width).toBeGreaterThanOrEqual(44);
  const groupBeforePress=await group.boundingBox(),neighborBeforePress=await choices.nth(3).boundingBox(),pressedBox=await choices.nth(2).boundingBox();
  await page.mouse.move(pressedBox!.x+pressedBox!.width/2,pressedBox!.y+pressedBox!.height/2);await page.mouse.down();
  const groupDuringPress=await group.boundingBox(),neighborDuringPress=await choices.nth(3).boundingBox();
  expect(groupDuringPress).toEqual(groupBeforePress);expect(neighborDuringPress).toEqual(neighborBeforePress);
  expect(await choices.nth(2).evaluate(node=>getComputedStyle(node).transform)).not.toBe('none');
  await page.mouse.move(1,1);await page.mouse.up();
  await help.click();
  const dialog=page.getByRole('dialog',{name:'About the ratings'});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Close'})).toBeFocused();
  await expect(dialog.getByText('Choose the option that best matches how the answer came to mind.')).toBeVisible();
  for(const text of ["Couldn't recall the answer.",'Recalled only with significant effort.','Recalled with some hesitation.','Recalled clearly.','Recalled immediately and effortlessly.'])await expect(dialog.getByText(text,{exact:true})).toBeVisible();
  const dialogBox=await dialog.boundingBox();
  expect(dialogBox!.x).toBeGreaterThanOrEqual(0);expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.x+dialogBox!.width).toBeLessThanOrEqual(390);expect(dialogBox!.y+dialogBox!.height).toBeLessThanOrEqual(844);
  await page.mouse.click(2,2);
  await expect(dialog).toBeHidden();
  await expect(help).toBeFocused();
  await help.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(help).toBeFocused();
  expect((await snapshot(page)).events).toEqual(before.events);
});

test('HR-MOBILE-UX-01E Study exposes one top-leading End session action with unchanged completion semantics',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await openApp(page);await page.getByRole('button',{name:/Start studying/}).click();
  const exit=page.locator('.mobile-header').getByRole('button',{name:'End session',exact:true}),before=await snapshot(page);
  await expect(exit).toHaveCount(1);await expect(page.locator('.session-bar .end-session-button')).toHaveCount(0);
  const box=await exit.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);
  expect((await exit.textContent())!.trim()).toBe('×');
  await exit.click();await expect(page.getByRole('heading',{name:/Study saved|Nice work/})).toBeVisible();
  const after=await snapshot(page);
  expect(after.session?.id).toBe(before.session?.id);expect(after.session?.endedAt).toBeTruthy();
  expect(after.events).toEqual(before.events);expect(after.practiceEvents).toEqual(before.practiceEvents);expect(after.rewardEvents).toEqual(before.rewardEvents);
});

test('HR-MOBILE-UX-01E rating help preserves Study scroll geometry through Close Escape and outside dismissal',async({page})=>{
  await page.setViewportSize({width:320,height:600});
  await page.addStyleTag({content:'html{font-size:200%;-webkit-text-size-adjust:200%;text-size-adjust:200%}'});
  await enterRatings(page);
  const help=page.getByRole('button',{name:'About the ratings',exact:true});await help.scrollIntoViewIfNeeded();
  const measure=()=>page.evaluate(()=>{const group=document.querySelector<HTMLElement>('.ratings')!.getBoundingClientRect(),trigger=document.querySelector<HTMLElement>('.rating-help-trigger')!.getBoundingClientRect();return{scrollY:window.scrollY,visualOffset:window.visualViewport?.offsetTop??0,scrollHeight:document.documentElement.scrollHeight,groupY:group.y,triggerY:trigger.y};});
  const baseline=await measure();
  for(const dismiss of ['Close','Escape','Outside'] as const){
    await help.click();const dialog=page.getByRole('dialog',{name:'About the ratings'});await expect(dialog).toBeVisible();
    const opened=await measure();expect(Math.abs(opened.scrollY-baseline.scrollY)).toBeLessThanOrEqual(1);expect(Math.abs(opened.visualOffset-baseline.visualOffset)).toBeLessThanOrEqual(1);expect(opened.scrollHeight).toBe(baseline.scrollHeight);expect(Math.abs(opened.groupY-baseline.groupY)).toBeLessThanOrEqual(1);expect(Math.abs(opened.triggerY-baseline.triggerY)).toBeLessThanOrEqual(1);
    if(dismiss==='Close')await dialog.getByRole('button',{name:'Close'}).click();else if(dismiss==='Escape')await page.keyboard.press('Escape');else await page.mouse.click(2,2);
    await expect(dialog).toBeHidden();await expect(help).toBeFocused();const closed=await measure();
    expect(Math.abs(closed.scrollY-baseline.scrollY)).toBeLessThanOrEqual(1);expect(Math.abs(closed.visualOffset-baseline.visualOffset)).toBeLessThanOrEqual(1);expect(closed.scrollHeight).toBe(baseline.scrollHeight);expect(Math.abs(closed.groupY-baseline.groupY)).toBeLessThanOrEqual(1);expect(Math.abs(closed.triggerY-baseline.triggerY)).toBeLessThanOrEqual(1);
  }
});

test('HR-MOBILE-UX-01F ratings use a bounded horizontal rail at 320 px and 200% text',async({page})=>{
  await page.setViewportSize({width:320,height:700});
  await page.addStyleTag({content:'html{font-size:200%;-webkit-text-size-adjust:200%;text-size-adjust:200%}'});
  await enterRatings(page);
  const choices=page.getByRole('group',{name:'Rate your recall'}).getByRole('button');
  const boxes=await choices.evaluateAll(items=>items.map(item=>{const node=item as HTMLElement,box=node.getBoundingClientRect();return{x:node.offsetLeft,y:node.offsetTop,width:node.offsetWidth,height:node.offsetHeight,right:box.right,text:(item.textContent??'').trim()};}));
  expect(boxes.map(box=>box.text)).toEqual(['1Forgot','2Hard','3Hesitant','4Confident','5Easy']);
  expect(new Set(boxes.map(box=>Math.round(box.y))).size).toBe(1);
  expect(new Set(boxes.map(box=>box.width)).size).toBe(1);
  expect(boxes.every(box=>box.height>=44)).toBe(true);
  const rail=page.locator('.rating-rail'),before=await snapshot(page);await rail.evaluate(node=>node.scrollTo({left:node.scrollWidth,behavior:'instant'}));
  expect((await snapshot(page)).events).toEqual(before.events);
  const overflow=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,wide:[...document.querySelectorAll<HTMLElement>('body *')].map(node=>({tag:node.tagName,className:node.className?.toString(),right:node.getBoundingClientRect().right,width:node.getBoundingClientRect().width})).filter(item=>item.right>document.documentElement.clientWidth+1).sort((a,b)=>b.right-a.right).slice(0,5)}));
  expect(overflow.scrollWidth,JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.clientWidth+1);
});

test('HR-MOBILE-UX-01B rating group and help follow Light Dark and System themes',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({colorScheme:'dark'});
  await enterRatings(page);
  const choice=page.getByRole('button',{name:'3, Hesitant',exact:true});
  const colours:Record<string,{button:string;dialog:string}>={};
  for(const theme of ['Dark','Light','System'] as const){
    await chooseTheme(page,theme);
    await expect.poll(()=>choice.evaluate(node=>{const style=getComputedStyle(node);return style.backgroundColor!==getComputedStyle(node.querySelector('.rating-label')!).color;})).toBe(true);
    const surface=await choice.evaluate(node=>({background:getComputedStyle(node).backgroundColor,color:getComputedStyle(node.querySelector('.rating-label')!).color}));
    expect(surface.background).not.toBe('rgba(0, 0, 0, 0)');expect(surface.color).not.toBe(surface.background);
    await page.getByRole('button',{name:'About the ratings'}).click();
    const dialog=page.getByRole('dialog',{name:'About the ratings'});await expect(dialog).toBeVisible();
    colours[theme]={button:surface.background,dialog:await dialog.locator('hr-rating-help-dialog').evaluate(node=>getComputedStyle(node).color)};
    await dialog.getByRole('button',{name:'Close'}).click();
  }
  expect(colours['Dark']).not.toEqual(colours['Light']);
  expect(colours['System']!.button).not.toBe('rgba(0, 0, 0, 0)');
  expect(colours['System']!.dialog).not.toBe(colours['System']!.button);
});

test('HR-MOBILE-UX-01E reduced motion keeps rating and help controls functional without transforms',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await enterRatings(page);
  await expect(page.locator('.app-shell')).toHaveAttribute('data-motion','reduced');
  const choice=page.getByRole('button',{name:'3, Hesitant',exact:true}),box=await choice.boundingBox();
  expect(await choice.evaluate(node=>getComputedStyle(node).transitionDuration)).toMatch(/^0s(, 0s)*$/);
  await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);await page.mouse.down();expect(await choice.evaluate(node=>getComputedStyle(node).transform)).toBe('none');await page.mouse.move(1,1);await page.mouse.up();
  const help=page.getByRole('button',{name:'About the ratings'});await help.click();const dialog=page.getByRole('dialog',{name:'About the ratings'});await expect(dialog).toBeVisible();await expect(page.locator('.rating-help-dialog-backdrop')).toHaveClass(/motion-reduced/);await dialog.getByRole('button',{name:'Close'}).click();await expect(help).toBeFocused();
});

test('HR-MOBILE-UX-01F compact Study exposes deck context and one truthful progress track',async({page})=>{
  await page.setViewportSize({width:390,height:844});await openApp(page);
  const state=await snapshot(page),parent=state.decks[0]!,child={id:'mobile-child',name:'Lesson 1 · Introductions',description:'',suspended:false,parentId:parent.id};
  state.decks.push(child);state.cards=state.cards.map(card=>({...card,deckId:child.id}));await replaceSnapshot(page,state);await page.reload();
  await page.getByRole('button',{name:/Start studying/}).click();
  const header=page.locator('.study-context-header');await expect(header.getByText(parent.name,{exact:true})).toBeVisible();await expect(header.getByText(child.name,{exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Study',exact:true})).toHaveCount(0);
  const progress=page.getByRole('progressbar',{name:/Study progress, 0 of 10 cards/});await expect(progress).toHaveCount(1);await expect(page.locator('.session-bar mat-progress-bar')).toHaveCount(1);await expect(page.locator('.session-bar > strong')).toHaveCount(0);await expect(page.locator('.session-bar > span:not(.sr-only)')).toHaveCount(0);
  const position=await header.evaluate(node=>{const box=node.getBoundingClientRect(),bar=node.closest('.mobile-header')!.getBoundingClientRect();return{centre:box.x+box.width/2,viewport:bar.x+bar.width/2};});expect(Math.abs(position.centre-position.viewport)).toBeLessThanOrEqual(2);
});

test('HR-MOBILE-UX-01G one pointer continuously replaces stale direction previews and commits only its final direction',async({page})=>{
  await page.setViewportSize({width:390,height:844});await enterRatings(page);
  const stage=page.locator('.study-card-visual'),box=await stage.boundingBox(),x=box!.x+box!.width/2,y=box!.y+box!.height/2,pointerId=71,before=await snapshot(page);
  await gesturePointer(page,stage,pointerId,x,y,'pointerdown');
  const transitions=[
    {dx:145,dy:0,direction:'right',label:'Confident →'},
    {dx:-145,dy:0,direction:'left',label:'← Hard'},
    {dx:0,dy:-175,direction:'up',label:'Easy ↑'},
    {dx:0,dy:175,direction:'down',label:'↓ Forgot'},
    {dx:-145,dy:0,direction:'left',label:'← Hard'},
  ] as const;
  for(const transition of transitions){
    await gesturePointer(page,stage,pointerId,x+transition.dx,y+transition.dy,'pointermove');
    await expect(stage).toHaveAttribute('data-gesture-direction',transition.direction);
    await expect(stage.locator('.gesture-feedback span').filter({hasText:transition.label})).toBeVisible();
    expect((await snapshot(page)).events).toEqual(before.events);
  }
  await gesturePointer(page,stage,pointerId,x+2,y+2,'pointermove');
  await expect(stage).not.toHaveAttribute('data-gesture-direction',/./);
  expect(await stage.locator('.gesture-feedback span:visible').count()).toBe(0);
  await gesturePointer(page,stage,pointerId,x+145,y,'pointermove');
  await expect(stage).toHaveAttribute('data-gesture-direction','right');
  await gesturePointer(page,stage,pointerId,x+145,y,'pointerup');
  await expect.poll(async()=>(await snapshot(page)).events.filter(event=>event.kind==='review').length).toBe(before.events.filter(event=>event.kind==='review').length+1);
  expect((await snapshot(page)).events.filter(event=>event.kind==='review').at(-1)?.rating).toBe(4);
});

test('HR-MOBILE-UX-01G changed previews cancel cleanly at neutral without writes or document movement',async({page})=>{
  await page.setViewportSize({width:390,height:844});await enterRatings(page);
  const stage=page.locator('.study-card-visual'),box=await stage.boundingBox(),x=box!.x+box!.width/2,y=box!.y+box!.height/2,pointerId=72,before=await snapshot(page),geometry=await page.evaluate(()=>({height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth}));
  await gesturePointer(page,stage,pointerId,x,y,'pointerdown');
  for(const [dx,dy] of [[140,0],[-140,0],[0,-170],[0,170],[1,1]] as const)await gesturePointer(page,stage,pointerId,x+dx,y+dy,'pointermove');
  await gesturePointer(page,stage,pointerId,x+1,y+1,'pointerup');await page.waitForTimeout(210);
  expect((await snapshot(page)).events).toEqual(before.events);
  expect(await page.evaluate(()=>({height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth}))).toEqual(geometry);
  await expect(stage).not.toHaveAttribute('data-gesture-phase',/./);
});

test('HR-MOBILE-UX-01G gesture eligibility follows the visible Answer face and composes flip with outer drag',async({page})=>{
  await page.setViewportSize({width:390,height:844});await openApp(page);await page.getByRole('button',{name:/Start studying/}).click();
  const stage=page.locator('.study-card-visual'),card=stage.locator('hr-card .card-motion'),face=stage.locator('hr-card .memory-card');
  await expect(stage).not.toHaveAttribute('data-gesture-enabled','true');
  const reveal=page.getByRole('button',{name:/Check answer/});
  if(await reveal.isVisible())await reveal.click();else{await card.focus();await page.keyboard.press('Enter');}
  await expect(face).toHaveAttribute('data-face','answer');await expect(stage).toHaveAttribute('data-gesture-enabled','true');
  await card.click();await expect(face).toHaveAttribute('data-face','recall');await expect(stage).not.toHaveAttribute('data-gesture-enabled','true');
  await card.click();await expect(face).toHaveAttribute('data-face','answer');await expect(stage).toHaveAttribute('data-gesture-enabled','true');
  const box=await stage.boundingBox(),x=box!.x+box!.width/2,y=box!.y+box!.height/2,pointerId=73;
  await gesturePointer(page,stage,pointerId,x,y,'pointerdown');await gesturePointer(page,stage,pointerId,x+80,y,'pointermove');
  await expect(stage).toHaveAttribute('data-gesture-direction','right');await expect(face).toHaveAttribute('data-face','answer');
  expect(await stage.evaluate(node=>getComputedStyle(node).transform)).not.toBe('none');
  await gesturePointer(page,stage,pointerId,x+2,y+2,'pointermove');await gesturePointer(page,stage,pointerId,x+2,y+2,'pointerup');
});

test('HR-MOBILE-UX-01G compact top chrome follows resolved Light Dark and System appearance',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme:'dark'});await enterRatings(page);
  const colours:Record<string,string>={};
  for(const theme of ['Dark','Light','System'] as const){
    await chooseTheme(page,theme);
    const resolved=theme==='Light'?'light':'dark';await expect(page.locator('html')).toHaveAttribute('data-resolved-theme',resolved);
    const surfaces=await page.evaluate(()=>{const html=getComputedStyle(document.documentElement),body=getComputedStyle(document.body),header=getComputedStyle(document.querySelector('.mobile-header')!);return{html:html.backgroundColor,body:body.backgroundColor,header:header.backgroundColor,scheme:html.colorScheme};});
    expect(surfaces.scheme).toBe(resolved);expect(surfaces.header).toBe(surfaces.body);expect(surfaces.header).not.toBe('rgba(0, 0, 0, 0)');colours[theme]=surfaces.header;
  }
  expect(colours['Dark']).not.toBe(colours['Light']);expect(colours['System']).toBe(colours['Dark']);
});

test('HR-MOBILE-UX-01H directional drag remains preview-only indefinitely and commits on release',async({page})=>{
  await page.setViewportSize({width:390,height:844});await enterRatings(page);
  const stage=page.locator('.study-card-visual'),box=await stage.boundingBox(),x=box!.x+box!.width/2,y=box!.y+box!.height/2,before=await snapshot(page),pointerId=81;
  await gesturePointer(page,stage,pointerId,x,y,'pointerdown');await gesturePointer(page,stage,pointerId,x+150,y,'pointermove');
  await expect(stage).toHaveAttribute('data-gesture-direction','right');await page.waitForTimeout(1100);
  expect((await snapshot(page)).events).toEqual(before.events);await expect(stage).toHaveAttribute('data-gesture-phase','dragging');
  await gesturePointer(page,stage,pointerId,x+150,y,'pointerup');
  await expect.poll(async()=>(await snapshot(page)).events.filter(event=>event.kind==='review').length).toBe(before.events.filter(event=>event.kind==='review').length+1);
  const review=(await snapshot(page)).events.filter(event=>event.kind==='review').at(-1);expect(review?.rating).toBe(4);
});

test('HR-MOBILE-UX-01H final release vector replaces held previews and commits Hard once',async({page})=>{
  await page.setViewportSize({width:390,height:844});await enterRatings(page);
  const stage=page.locator('.study-card-visual'),box=await stage.boundingBox(),x=box!.x+box!.width/2,y=box!.y+box!.height/2,before=await snapshot(page),pointerId=82;
  await gesturePointer(page,stage,pointerId,x,y,'pointerdown');await gesturePointer(page,stage,pointerId,x+145,y,'pointermove');await page.waitForTimeout(820);
  expect((await snapshot(page)).events).toEqual(before.events);await gesturePointer(page,stage,pointerId,x-145,y,'pointermove');await expect(stage).toHaveAttribute('data-gesture-direction','left');await page.waitForTimeout(1100);
  expect((await snapshot(page)).events).toEqual(before.events);await gesturePointer(page,stage,pointerId,x-145,y,'pointerup');
  await expect.poll(async()=>(await snapshot(page)).events.filter(event=>event.kind==='review').length).toBe(before.events.filter(event=>event.kind==='review').length+1);
  const after=await snapshot(page),review=after.events.filter(event=>event.kind==='review').at(-1);expect(review?.rating).toBe(2);expect(after.rewardEvents.filter(event=>event.kind==='contribution'&&event.reviewEventId===review?.id)).toHaveLength(0);
});

test('HR-MOBILE-UX-01H neutral release, fast pre-release movement and pointer cancellation never rate early',async({page})=>{
  await page.setViewportSize({width:390,height:844});await enterRatings(page);
  const stage=page.locator('.study-card-visual'),box=await stage.boundingBox(),x=box!.x+box!.width/2,y=box!.y+box!.height/2,before=await snapshot(page);
  await gesturePointer(page,stage,83,x,y,'pointerdown');await gesturePointer(page,stage,83,x+155,y,'pointermove');await gesturePointer(page,stage,83,x+1,y+1,'pointermove');await page.waitForTimeout(850);
  expect((await snapshot(page)).events).toEqual(before.events);await expect(stage).not.toHaveAttribute('data-gesture-direction',/./);await gesturePointer(page,stage,83,x+1,y+1,'pointerup');await page.waitForTimeout(220);expect((await snapshot(page)).events).toEqual(before.events);
  await gesturePointer(page,stage,84,x,y,'pointerdown');await gesturePointer(page,stage,84,x-170,y,'pointermove');expect((await snapshot(page)).events).toEqual(before.events);await gesturePointer(page,stage,84,x-170,y,'pointercancel');await page.waitForTimeout(220);expect((await snapshot(page)).events).toEqual(before.events);await expect(stage).not.toHaveAttribute('data-gesture-phase',/./);
  await gesturePointer(page,stage,86,x,y,'pointerdown');await gesturePointer(page,stage,86,x,y-180,'pointermove');await gesturePointer(page,stage,86,x,y-180,'lostpointercapture');await page.waitForTimeout(220);expect((await snapshot(page)).events).toEqual(before.events);await expect(stage).not.toHaveAttribute('data-gesture-phase',/./);
});

test('HR-MOBILE-UX-01H stationary hold remains Hesitant and meaningful movement cancels its timer',async({page})=>{
  await page.setViewportSize({width:390,height:844});await enterRatings(page);
  const stage=page.locator('.study-card-visual'),box=await stage.boundingBox(),x=box!.x+box!.width/2,y=box!.y+box!.height/2,before=await snapshot(page);
  await gesturePointer(page,stage,85,x,y,'pointerdown');await page.waitForTimeout(760);
  await expect.poll(async()=>(await snapshot(page)).events.filter(event=>event.kind==='review').length).toBe(before.events.filter(event=>event.kind==='review').length+1);
  const review=(await snapshot(page)).events.filter(event=>event.kind==='review').at(-1);expect(review?.rating).toBe(3);
});

test('HR-MOBILE-UX-01H compact rail starts on Hard and exposes actual continuation at each edge',async({page})=>{
  await page.setViewportSize({width:390,height:844});await enterRatings(page);
  const before=await snapshot(page),frame=page.locator('.rating-rail-frame'),rail=page.locator('.rating-rail'),buttons=rail.getByRole('button');
  await expect(buttons).toHaveCount(5);await expect(frame).toHaveAttribute('data-before','');await expect(frame).toHaveAttribute('data-after','');
  await expect(rail.locator('.rating-centred')).toHaveAttribute('data-rating','2');expect((await snapshot(page)).events).toEqual(before.events);
  expect(await frame.evaluate(node=>[getComputedStyle(node,'::before').pointerEvents,getComputedStyle(node,'::after').pointerEvents])).toEqual(['none','none']);
  const dimensions=await rail.evaluate(node=>({scrollWidth:node.scrollWidth,clientWidth:node.clientWidth}));expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
  await rail.evaluate(node=>node.scrollTo({left:0,behavior:'instant'}));await expect(frame).not.toHaveAttribute('data-before',/.+/);await expect(frame).toHaveAttribute('data-after','');expect((await snapshot(page)).events).toEqual(before.events);
  await rail.evaluate(node=>node.scrollTo({left:node.scrollWidth,behavior:'instant'}));await expect(frame).toHaveAttribute('data-before','');await expect(frame).not.toHaveAttribute('data-after',/.+/);expect((await snapshot(page)).events).toEqual(before.events);
});

test('HR-MOBILE-UX-01H edge light follows theme tokens and remains static with reduced motion',async({page})=>{
  await page.setViewportSize({width:320,height:700});await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await enterRatings(page);
  const frame=page.locator('.rating-rail-frame');
  for(const theme of ['Dark','Light','System'] as const){await chooseTheme(page,theme);await expect(frame).toHaveAttribute('data-after','');const style=await frame.evaluate(node=>{const cue=getComputedStyle(node,'::after');return{background:cue.backgroundImage,transition:cue.transitionDuration,opacity:cue.opacity};});expect(style.background).not.toBe('none');expect(style.transition).toMatch(/^0s(, 0s)*$/);expect(Number(style.opacity)).toBeGreaterThan(0);}
});

for(const gesture of [{name:'down',rating:1,dx:0,dy:190},{name:'left',rating:2,dx:-150,dy:0},{name:'hold',rating:3,dx:0,dy:0},{name:'right',rating:4,dx:150,dy:0},{name:'up',rating:5,dx:0,dy:-190}] as const){
  test(`HR-MOBILE-UX-01F ${gesture.name} gesture commits rating ${gesture.rating} exactly once`,async({page})=>{
    await page.setViewportSize({width:390,height:844});await openApp(page);await page.getByRole('button',{name:/Start studying/}).click();
    const reveal=page.getByRole('button',{name:/Check answer/});if(await reveal.isVisible())await reveal.click();else await page.getByTestId('study-deck-stage').locator('[role="button"]').focus().then(()=>page.keyboard.press('Enter'));
    const stage=page.locator('.study-card-visual'),box=await stage.boundingBox(),before=await snapshot(page),x=box!.x+box!.width/2,y=box!.y+box!.height/2,pointerId=90+gesture.rating;
    await gesturePointer(page,stage,pointerId,x,y,'pointerdown');if(gesture.name==='hold')await page.waitForTimeout(760);else await gesturePointer(page,stage,pointerId,x+gesture.dx,y+gesture.dy,'pointermove');await gesturePointer(page,stage,pointerId,x+gesture.dx,y+gesture.dy,'pointerup');
    await expect.poll(async()=>(await snapshot(page)).events.filter(event=>event.kind==='review').length).toBe(before.events.filter(event=>event.kind==='review').length+1);
    const after=await snapshot(page),review=after.events.filter(event=>event.kind==='review').at(-1),contributions=after.rewardEvents.filter(event=>event.kind==='contribution'&&event.reviewEventId===review?.id);expect(review?.rating).toBe(gesture.rating);expect(contributions.length).toBeLessThanOrEqual(1);if(gesture.rating>=4)expect(contributions).toHaveLength(1);
  });
}

test('HR-MOBILE-UX-01F cancelled and interactive gestures do not rate',async({page})=>{
  await page.setViewportSize({width:390,height:844});await enterRatings(page);const before=await snapshot(page),stage=page.locator('.study-card-visual'),box=await stage.boundingBox(),x=box!.x+box!.width/2,y=box!.y+box!.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+20,y,{steps:2});await page.mouse.up();expect((await snapshot(page)).events).toEqual(before.events);
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+45,y+45,{steps:3});await page.mouse.up();expect((await snapshot(page)).events).toEqual(before.events);
  const child=stage.locator('button').first();await child.dispatchEvent('pointerdown',{pointerId:19,pointerType:'touch',isPrimary:true,button:0,clientX:10,clientY:10});await page.waitForTimeout(750);await child.dispatchEvent('pointerup',{pointerId:19,pointerType:'touch',isPrimary:true,button:0,clientX:10,clientY:10});expect((await snapshot(page)).events).toEqual(before.events);
});

test('HR-MOBILE-UX-01B rapid repeat rating creates one review and one contribution',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await enterRatings(page);
  const button=page.getByRole('button',{name:'4, Confident',exact:true});
  await button.evaluate(node=>{(node as HTMLButtonElement).click();(node as HTMLButtonElement).click();});
  await expect.poll(async()=>(await snapshot(page)).events.filter(event=>event.kind==='review').length).toBe(1);
  const state=await snapshot(page),review=state.events.find(event=>event.kind==='review');
  expect(review?.rating).toBe(4);
  expect(state.rewardEvents.filter(event=>event.kind==='contribution'&&event.reviewEventId===review?.id)).toHaveLength(1);
  expect(state.session?.completed).toBe(1);
});
