/* Generic planning import. Payloads stay in the signed-in browser, never in this repository. */
(() => {
'use strict';
const TYPES=new Set(['post','carrossel','reels']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function checkDate(value){
 if(value===null)return;
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value)throw Error('Data inválida no planejamento.');
}
function parse(text){
 const payload=JSON.parse(text);
 if(payload.version!==1||typeof payload.client_slug!=='string'||!payload.client_slug||!Array.isArray(payload.items)||!payload.items.length||payload.items.length>100)throw Error('Use um planejamento versão 1, com cliente e de 1 a 100 itens.');
 const ids=new Set();
 for(const item of payload.items){
  if(!item||!UUID.test(item.id)||ids.has(item.id)||!['create','update'].includes(item.action))throw Error('Há um identificador inválido ou repetido.');
  ids.add(item.id);
  if(typeof item.roteiro!=='string'||!item.roteiro.trim()||item.roteiro.length>30000)throw Error('Cada ideia precisa de um briefing de até 30 mil caracteres.');
  if(item.action==='create'&&(!item.titulo||!TYPES.has(item.tipo)||!has(item,'data_prevista')))throw Error('Ideia nova sem título, formato ou data.');
  if(has(item,'titulo')&&(typeof item.titulo!=='string'||!item.titulo.trim()||item.titulo.length>250))throw Error('Título inválido.');
  if(has(item,'tipo')&&!TYPES.has(item.tipo))throw Error('Formato inválido.');
  if(has(item,'data_prevista'))checkDate(item.data_prevista);
  if(item.action==='update'&&(!has(item,'expected_title')||!has(item,'expected_date')))throw Error('Atualização sem identificação do conteúdo anterior.');
  if(has(item,'expected_date'))checkDate(item.expected_date);
 }
 return payload;
}
async function preview(sb,token,payload){
 if(!UUID.test(token||''))throw Error('Abra pelo link do cliente.');
 const admin=await sb.rpc('is_admin');
 if(admin.error||!admin.data)throw Error('Entre na área da agência antes de importar.');
 const response=await sb.rpc('portal_dados',{p_token:token});
 if(response.error)throw response.error;
 const data=response.data;
 if(data.cliente?.slug!==payload.client_slug||!data.cliente?.id)throw Error('Este planejamento pertence a outro cliente.');
 const posts=data.posts||[], jobs=[];
 for(const item of payload.items){
  const existing=posts.find(p=>p.id===item.id);
  if(item.action==='create'){
   const duplicate=existing||posts.find(p=>p.titulo===item.titulo&&p.tipo===item.tipo&&(p.data_prevista||null)===item.data_prevista);
   jobs.push({item,existing:duplicate,action:duplicate?'skip':'create'});continue;
  }
  if(!existing)throw Error('Conteúdo anterior não encontrado: '+item.expected_title);
  const patch={roteiro:item.roteiro};
  for(const key of ['titulo','tipo','data_prevista'])if(has(item,key))patch[key]=item[key];
  if(Object.entries(patch).every(([k,v])=>(existing[k]??null)===v)){jobs.push({item,existing,action:'skip'});continue;}
  if(existing.etapa!=='copy'||existing.titulo!==item.expected_title||(existing.data_prevista||null)!==item.expected_date)throw Error('O conteúdo mudou desde o levantamento: '+item.expected_title+'. Revise antes de importar.');
  jobs.push({item,existing,patch,action:'update'});
 }
 return {client:data.cliente,round:data.rodada||null,posts,jobs};
}
async function apply(sb,token,payload,progress=()=>{}){
 // Revalidate immediately before writing, including existing approvals and dates.
 const plan=await preview(sb,token,payload);
 const max=Math.max(0,...plan.posts.map(p=>Number(p.ordem)||0));
 const result={created:[],updated:[],skipped:[],failed:null};
 for(let i=0;i<plan.jobs.length;i++){
  const job=plan.jobs[i], item=job.item;
  try{
   if(job.action==='skip'){result.skipped.push(job.existing.id);progress(i+1,plan.jobs.length,job);continue;}
   if(job.action==='create'){
    const row={id:item.id,cliente_id:plan.client.id,rodada_id:plan.round,titulo:item.titulo,tipo:item.tipo,data_prevista:item.data_prevista,hora_prevista:null,roteiro:item.roteiro,legenda:'',midias:[],etapa:'copy',copy_status:'pendente',status:'pendente',plataformas:['instagram'],ordem:max+i+1};
    const response=await sb.from('posts').insert(row).select('id').single();
    if(response.error||response.data?.id!==item.id)throw response.error||Error('Cadastro não confirmado pelo servidor.');
    result.created.push(item.id);
   }else{
    let q=sb.from('posts').update({...job.patch,updated_at:new Date().toISOString()}).eq('id',item.id).eq('cliente_id',plan.client.id).eq('etapa','copy').eq('titulo',job.existing.titulo);
    q=job.existing.data_prevista?q.eq('data_prevista',job.existing.data_prevista):q.is('data_prevista',null);
    q=job.existing.roteiro===null||job.existing.roteiro===undefined?q.is('roteiro',null):q.eq('roteiro',job.existing.roteiro);
    const response=await q.select('id');
    if(response.error||response.data?.length!==1)throw response.error||Error('O card mudou ou não pôde ser atualizado.');
    result.updated.push(item.id);
   }
   progress(i+1,plan.jobs.length,job);
  }catch(error){result.failed={id:item.id,title:item.titulo||item.expected_title,message:error.message||String(error)};break;}
 }
 return result;
}
window.PlanningImport={parse,preview,apply};
})();
