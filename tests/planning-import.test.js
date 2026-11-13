(async()=>{
const copy=x=>JSON.parse(JSON.stringify(x)),check=(ok,m)=>{if(!ok)throw Error(m);};
const client='c900e3a7-f76b-4399-bb5b-b58c4ac6831d';
const published={id:'00000000-0000-4000-8000-000000000001',cliente_id:client,titulo:'Já publicado',tipo:'post',data_prevista:'2026-11-10',etapa:'publicado',status:'publicado',roteiro:'Original',legenda:'Preservar',midias:[{id:'existing'}],ordem:1000003};
const draft={id:'00000000-0000-4000-8000-000000000002',cliente_id:client,titulo:'Ideia anterior',tipo:'reels',data_prevista:'2026-11-20',etapa:'copy',status:'pendente',copy_status:'pendente',roteiro:'Histórico',legenda:'Não apagar',midias:[],ordem:4};
const id='00000000-0000-4000-8000-000000000003';
const base={version:1,client_slug:'margo',items:[{action:'create',id,titulo:'Ideia nova',tipo:'carrossel',data_prevista:'2026-12-03',roteiro:'Proposta com materiais e pendências.'},{action:'update',id:draft.id,expected_title:draft.titulo,expected_date:draft.data_prevista,roteiro:'Histórico + novos materiais.'}]};
let rows=[copy(published),copy(draft)],admin=true,writes=0,failId=null;
const sb={rpc:async name=>name==='is_admin'?{data:admin,error:null}:{data:{cliente:{id:client,slug:'margo',nome:'Teste'},rodada:null,posts:copy(rows)},error:null},from:()=>({
 insert:row=>({select:()=>({single:async()=>{if(failId===row.id)return {error:{message:'failure'}};if(rows.some(p=>p.id===row.id))throw Error('Duplicate');rows.push(copy(row));writes++;return {data:{id:row.id},error:null};}})}),
 update:patch=>{const filters=[],q={eq(k,v){filters.push([k,v]);return q;},is(k,v){filters.push([k,v]);return q;},async select(){const row=rows.find(p=>filters.every(([k,v])=>(p[k]??null)===v));if(!row||failId===row.id)return {data:[],error:{message:'changed'}};Object.assign(row,copy(patch));writes++;return {data:[{id:row.id}],error:null};}};return q;}
})};
const token='09d3417e-4eff-40da-a56b-72859f864732';
try{
 let rejected=false;try{PlanningImport.parse(JSON.stringify({...base,items:[...base.items,base.items[0]]}));}catch{rejected=true;}check(rejected,'Duplicate payload IDs accepted');
 const payload=PlanningImport.parse(JSON.stringify(base));
 admin=false;rejected=false;try{await PlanningImport.apply(sb,token,payload);}catch{rejected=true;}check(rejected&&writes===0,'No admin guard');admin=true;
 rejected=false;try{await PlanningImport.apply(sb,token,{...payload,client_slug:'other'});}catch{rejected=true;}check(rejected&&writes===0,'Wrong client accepted');
 const before=copy(published),result=await PlanningImport.apply(sb,token,payload);
 check(result.created.length===1&&result.updated.length===1&&!result.failed,'Import counts');
 check(JSON.stringify(rows.find(p=>p.id===published.id))===JSON.stringify(before),'Published content changed');
 const created=rows.find(p=>p.id===id);check(created.etapa==='copy'&&created.copy_status==='pendente'&&created.status==='pendente'&&created.midias.length===0,'Imported as approved or media');
 check(created.cliente_id===client&&created.legenda==='','Wrong client or invented copy');
 const changed=rows.find(p=>p.id===draft.id);check(changed.data_prevista===draft.data_prevista&&changed.tipo===draft.tipo&&changed.legenda===draft.legenda&&changed.ordem===draft.ordem,'Existing dates/order/copy changed');
 const count=writes,again=await PlanningImport.apply(sb,token,payload);check(again.created.length===0&&again.updated.length===0&&again.skipped.length===2&&writes===count,'Retry not idempotent');
 const rename={...payload,items:[{action:'update',id:draft.id,expected_title:draft.titulo,expected_date:draft.data_prevista,titulo:'Replanejada',data_prevista:'2027-01-17',roteiro:'Histórico + novo mês'}]};
 check((await PlanningImport.apply(sb,token,rename)).updated.length===1,'Reschedule failed');check((await PlanningImport.apply(sb,token,rename)).skipped.length===1,'Reschedule retry failed');
 const immutable=copy(rows);rejected=false;try{await PlanningImport.apply(sb,token,{...payload,items:[{...payload.items[0],id:'00000000-0000-4000-8000-000000000009'},{...payload.items[1],id:published.id,expected_title:published.titulo,expected_date:published.data_prevista}]});}catch{rejected=true;}check(rejected&&JSON.stringify(immutable)===JSON.stringify(rows),'Preflight allowed updating published post or wrote before validation');
 rows=[copy(published),copy(draft)];failId=draft.id;const partial=await PlanningImport.apply(sb,token,payload);check(partial.created.length===1&&partial.failed.id===draft.id,'Partial failure not reported');failId=null;
 const resume=await PlanningImport.apply(sb,token,payload);check(resume.created.length===0&&resume.updated.length===1&&resume.skipped.length===1,'Resume duplicated successful rows');
 document.body.dataset.testResult='PASS: authorization, client isolation, copy-stage import, existing content preservation, idempotent retry, reschedule, full preflight and partial resume';
}catch(e){document.body.dataset.testResult='FAIL: '+e.message;}
})();
