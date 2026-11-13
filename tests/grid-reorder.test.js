// Injected into the actual app by grid-reorder.browser.py; no live service is called.
(async () => {
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const clone=x=>JSON.parse(JSON.stringify(x));
const initial=[
 {id:'a',cliente_id:'client-test',titulo:'Publicado 16',ordem:5,etapa:'publicado',status:'publicado',data_prevista:'2026-11-16'},
 {id:'b',cliente_id:'client-test',titulo:'Previsto 14',ordem:5,etapa:'aprovado',status:'aprovado',data_prevista:'2026-11-14'},
 {id:'c',cliente_id:'client-test',titulo:'Previsto 12',ordem:2,etapa:'aprovacao',status:'pendente',data_prevista:'2026-11-12'},
 {id:'d',cliente_id:'client-test',titulo:'Publicado 10',ordem:9,etapa:'publicado',status:'publicado',data_prevista:'2026-11-10'},
 {id:'copy',cliente_id:'client-test',titulo:'Rascunho',ordem:4,etapa:'copy',status:'pendente',data_prevista:null}
].map(p=>({...p,tipo:'post',midias:[],comentarios:[],plataformas:['instagram'],legenda:'Legenda original'}));
let rows=clone(initial),writes=[],failId=null,created=0;
const sbMock={
 storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"}}),remove:async()=>({error:null})})},
 rpc:async()=>({data:{cliente:{id:'client-test',nome:'Teste'},posts:clone(rows),comentarios:[]},error:null}),
 from:table=>({insert:doc=>{
   if(table!=='posts')return Promise.resolve({error:null});
   const row={...clone(doc),id:'created-'+(++created)};rows.push(row);
   return {select:()=>({single:async()=>({data:{id:row.id},error:null})})};
  },update:patch=>{
  const filters=[];const q={eq(k,v){filters.push([k,v]);return q;},is(k,v){filters.push([k,v]);return q;},
   async select(){
    writes.push({patch:clone(patch),filters:clone(filters)});
    const row=rows.find(p=>filters.every(([k,v])=>p[k]===v));
    if(row?.id===failId && patch.ordem>=GRID_MANUAL_BASE)return {error:{message:'simulated failure'}};
    if(!row)return {data:[],error:null};
    Object.assign(row,patch);return {data:[{id:row.id,ordem:row.ordem}],error:null};
   },then(resolve,reject){return q.select().then(resolve,reject);}};return q;
 }})
};
window.__gridTestDB=sbMock;
const ids=()=>sorted().map(p=>p.id).join();
const persistedFields=()=>rows.map(({ordem,updated_at,...p})=>p);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitSave=async()=>{for(let i=0;i<200 && GRID_SAVE_BUSY;i++)await sleep(5);assert(!GRID_SAVE_BUSY,'Save never completed');};
try {
 S.token='09d3417e-4eff-40da-a56b-72859f864732';S.isOwner=true;S.mode='agencia';S.view='feed';
 await refresh();
 assert(ids()==='a,b,c,d','Initial newest-first publication order and all future posts');
 assert(document.querySelectorAll('#grid [draggable="true"]').length===4,'Agency cannot drag all feed posts');
 assert(!$('#gridEditHint').hidden,'Missing drag hint');
 const fieldsBefore=JSON.stringify(persistedFields());
 const source=$('#grid [data-id="d"]'),target=$('#grid [data-id="b"]'),transfer=new DataTransfer();
 source.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:transfer}));
 target.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));
 assert(target.classList.contains('grid-drop'),'No visible drop position');
 target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
 await waitSave();await sleep(10);
 assert(ids()==='a,d,b,c','Native drag did not move post into target position');
 assert(rows.filter(p=>p.etapa!=='copy').every(p=>p.ordem>=GRID_MANUAL_BASE),'Manual order not persisted');
 assert(JSON.stringify(persistedFields())===fieldsBefore,'Dates/status/copy/media changed');
 assert(rows.find(p=>p.id==='copy').ordem===4,'Draft changed');
 assert(writes.every(w=>Object.keys(w.patch).sort().join()==='ordem,updated_at'),'Unexpected field written');
 assert(writes.every(w=>w.filters.some(([k,v])=>k==='cliente_id'&&v==='client-test')),'Unscoped write');
 S.posts=[];await refresh();assert(ids()==='a,d,b,c','Reload lost order');
 S.sel='d';renderDetail();
 document.querySelector('[data-act="down"]').click();await waitSave();await sleep(10);
 assert(ids()==='a,b,d,c','Accessible move button did not persist');
 const beforeFailure=rows.map(p=>p.ordem).join();failId='b';
 assert(await moveGridPost('c','a')===false,'Failure reported as success');
 assert(rows.map(p=>p.ordem).join()===beforeFailure,'Partial save was not rolled back');failId=null;
 // Exercise the actual touch handle handlers. Synthetic pointers need capture stubs.
 const grid=$('#grid');let captured=null;
 grid.setPointerCapture=id=>{captured=id;};grid.hasPointerCapture=id=>captured===id;grid.releasePointerCapture=()=>{captured=null;};
 grid.scrollIntoView({block:'center'});await sleep(20);
 const grip=$('#grid [data-id="a"] .grid-grip'),end=$('#grid [data-id="b"]').getBoundingClientRect();
 const start=grip.getBoundingClientRect();
 grip.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:71,pointerType:'touch',clientX:start.x+10,clientY:start.y+10}));
 assert(!!GRID_DRAG.ghost,'Touch handle did not start drag');
 window.dispatchEvent(new PointerEvent('pointermove',{pointerId:71,pointerType:'touch',clientX:end.x+end.width/2,clientY:end.y+end.height/2,cancelable:true}));
 window.dispatchEvent(new PointerEvent('pointerup',{pointerId:71,pointerType:'touch',clientX:end.x+end.width/2,clientY:end.y+end.height/2}));
 await waitSave();await sleep(10);assert(ids()==='b,a,d,c','Touch drop did not persist');
 assert(!document.querySelector('.grid-ghost'),'Ghost leaked');
 S.isOwner=false;S.mode='cliente';renderAll();const writeCount=writes.length;
 assert(!document.querySelector('#grid [draggable="true"]')&&!document.querySelector('.grid-grip'),'Client can edit grid');
 assert($('#gridEditHint').hidden,'Client sees edit hint');
 assert(await moveGridPost('a','c')===false&&writes.length===writeCount,'Client wrote order');
 assert(ids()==='b,a,d,c','Client sees different order');
 // New dated posts are inserted without rearranging the existing sequence.
 S.isOwner=true;S.mode='agencia';S.token='09d3417e-4eff-40da-a56b-72859f864732';
 rows=clone(initial).map((p,i)=>({...p,ordem:p.etapa==='copy'?4:GRID_MANUAL_BASE+10-i}));await refresh();
 const baseline=ids();assert(baseline==='a,b,c,d','Manual baseline');
 const add=async(id,date,time=null)=>{rows.push({...clone(initial[1]),id,titulo:id,data_prevista:date,hora_prevista:time,ordem:GRID_MANUAL_BASE+100+rows.length});await refresh();await placeGridPostByDate(id);};
 await add('middle','2026-11-13');assert(ids()==='a,b,middle,c,d','Middle date not inserted by publication');
 assert(sorted().filter(p=>p.id!=='middle').map(p=>p.id).join()===baseline,'Existing manual order changed');
 await add('newest','2026-11-20');assert(sorted()[0].id==='newest','Newest post not on top');
 await add('undated',null);assert(sorted().at(-1).id==='undated','Undated post not last');
 await add('oldest','2026-11-01');assert(ids().endsWith('oldest,undated'),'Old post not below newer posts');
 await add('hour','2026-11-13','15:00');assert(ids().includes('hour,middle'),'Time of day not respected');
 const movedDate=rows.find(p=>p.id==='middle');movedDate.data_prevista='2026-11-19';await refresh();await placeGridPostByDate('middle');
 assert(ids().startsWith('newest,middle,a'),'Changed date not reinserted');
 // Use the real creation form and stage-to-feed flow, not only the insertion helper.
 openPostForm(null);$('#pTitulo').value='Created from form';$('#pData').value='2026-11-15';
 F.items=[{id:'test-media',tipo:'image'}];await submitPost();
 assert(ids().includes('a,created-1,b'),'New post form did not insert into dated slot: '+ids()+' / '+($('#formErr')?.textContent||''));
 const draft=rows.find(p=>p.id==='copy');draft.midias=[{id:'draft-media',tipo:'image'}];draft.data_prevista='2026-11-17';await refresh();
 assert(await moveCard(getPost('copy'),'aprovacao'),'Stage transition failed');
 assert(ids().includes('middle,copy,a'),'Production-to-feed post not inserted by date');
 S.posts=[];await refresh();assert(ids().includes('a,created-1,b'),'Automatic placement lost on reload');
 S.isOwner=false;S.mode='cliente';renderAll();assert(await placeGridPostByDate('oldest')===false,'Client triggered auto writes');
 S.posts=clone(initial);S.token='another-client';assert(ids()==='d,a,b,c','Other client order changed');
 document.body.dataset.testResult='PASS: desktop drag, touch handle, move buttons, persistence/reload/client view, duplicate ranks, rollback, field preservation client isolation, dated insertion, creation form and production-to-feed';
}catch(error){document.body.dataset.testResult='FAIL: '+error.message;}
})();
