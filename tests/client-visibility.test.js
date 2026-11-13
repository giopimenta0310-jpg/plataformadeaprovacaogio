(async()=>{
const assert=(ok,message)=>{if(!ok)throw Error(message);};
try{
 S.posts=ETAPAS.map((e,i)=>({id:e.k,titulo:'Conteudo '+e.k,etapa:e.k,ordem:i,status:'pendente',copy_status:'pendente',tipo:'post',legenda:'Texto',roteiro:'Briefing interno',midias:[],comentarios:[],plataformas:[e.k==='copy'?'tiktok':'instagram'],data_prevista:'2026-11-20'}));
 S.calMonth=new Date(2026,10,1);S.calPlat='todas';S.isOwner=true;S.mode='agencia';
 renderAll();assert(document.querySelectorAll('#board .col').length===6,'Agency needs all six stages');
 assert(calPosts().length===6,'Agency calendar needs drafts');
 openCard('copy');assert(!$('#cardModal').hidden,'Agency can open draft');
 S.mode='cliente';renderAll();
 assert($('#cardModal').hidden,'Switching to client preview must close internal draft');
 assert(visiblePosts().length===4,'Client preview excludes internal stages');
 assert(!getPost('copy')&&!getPost('producao'),'Internal cards cannot open in client preview');
 assert(document.querySelectorAll('#board .col').length===4,'Client board starts at approval');
 assert(!$('#board').textContent.includes('Briefing interno'),'Internal brief absent from client board');
 assert(!$('#calLegend').textContent.includes('Copy e roteiro')&&!$('#calLegend').textContent.includes('Em produção'),'Calendar legend excludes internal stages');
 assert(calPosts().length===4,'Calendar excludes both internal stages');
 assert(!$('#calPlat').textContent.includes('TikTok'),'Internal-only platform not exposed in calendar filters');
 assert(!$('#summary').textContent.includes('3 esperando'),'Summary must not count pending draft');
 openCard('copy');assert($('#cardModal').hidden,'Direct internal card open stays blocked');
 S.isOwner=false;renderAll();assert(visiblePosts().length===4,'Anonymous client has same visibility');
 assert(sorted().length===4,'Future approval and published posts remain in feed');
 S.posts=S.posts.filter(p=>['copy','producao'].includes(p.etapa));renderAll();
 assert($('#summary').textContent===''&&calPosts().length===0,'Draft-only client has no pending work');
 S.isOwner=true;S.mode='agencia';renderAll();assert(visiblePosts().length===2&&calPosts().length===2,'Returning to agency restores drafts without losing data');
 document.body.setAttribute('data-test-result','PASS: client board, calendar, summary, modal guards, agency preview and draft preservation');
}catch(e){document.body.setAttribute('data-test-result','FAIL: '+e.message);}
})();
