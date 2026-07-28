(() => {
'use strict';
const n=v=>String(v??'').normalize('NFKC').toLocaleLowerCase();
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const load=async path=>{const r=await fetch(path,{cache:'default',credentials:'same-origin',headers:{Accept:'application/json'}});if(!r.ok)throw Error(`${path}: HTTP ${r.status}`);return r.json()};
const score=(x,terms)=>terms.reduce((s,t)=>s+(n(`${x.titleTa} ${x.titleEn}`).includes(t)?30:0)+(n((x.tags||[]).join(' ')).includes(t)?15:0)+(n(`${x.summary} ${x.kind} ${x.status||''}`).includes(t)?8:0),0);
const history={get(){try{const value=JSON.parse(localStorage.getItem('osb-search-history')||'[]');return Array.isArray(value)?value:[]}catch{return[]}},set(value){try{localStorage.setItem('osb-search-history',JSON.stringify(value))}catch{}}};
document.addEventListener('DOMContentLoaded',async()=>{
 const form=document.getElementById('advancedSearchForm'),q=document.getElementById('q'),type=document.getElementById('searchType'),results=document.getElementById('results'),count=document.getElementById('resultCount'),recentBox=document.getElementById('searchSuggestions');
 if(!form||!q||!type||!results||!count||!recentBox)return;
 try{
  const [baseIndex,songLibrary,sourceRequests,mantraPractice,mantras]=await Promise.all([
   load('data/search-index.json'),
   load('data/murugan-song-library.json').catch(()=>({collections:[]})),
   load('data/song-source-requests.json').catch(()=>({records:[]})),
   load('data/mantra-practice.json').catch(()=>({mantraIds:[]})),
   load('data/murugan-mantras.json').catch(()=>([]))
  ]);
  const collectionRecords=(songLibrary.collections||[]).map(item=>({
   kind:'Song Collection',
   id:item.id,
   titleTa:item.titleTa,
   titleEn:item.titleEn,
   summary:`${item.summary||''} ${item.statusLabel||''}`.trim(),
   route:item.route,
   tags:[item.category,item.status,...(item.availableFormats||[]),...(item.missingFormats||[])].filter(Boolean),
   status:item.status
  }));
  const requestRecords=(sourceRequests.records||[]).map(item=>({
   kind:'Song Source Request',
   id:item.id,
   titleTa:item.titleTa,
   titleEn:item.titleEn,
   summary:'Requested song identity. Exact source and publication rights are still required; no lyrics or recording are claimed.',
   route:`song-source-requests.html?q=${encodeURIComponent(item.titleEn||item.id)}`,
   tags:[item.category,item.status,'missing song','source request'].filter(Boolean),
   status:item.status
  }));
  const publishedMantras=(Array.isArray(mantras)?mantras:[]).filter(item=>(mantraPractice.mantraIds||[]).includes(item.id)&&item.status==='published');
  const mantraPracticeRecord=publishedMantras.length===6?[{
   kind:'Devotional Practice',
   id:'murugan-mantra-practice',
   titleTa:'முருகன் ஜப அறை',
   titleEn:'Murugan Mantra Practice',
   summary:'Private Tamil-first 6–108 counter using six existing published mantra records, optional device speech and browser-local history.',
   route:'mantra-practice.html',
   tags:['japa','mantra','counter','108','Tamil','private',...publishedMantras.flatMap(item=>[item.titleTa,item.titleEn])],
   status:'published-source-linked'
  }]:[];
  const index=[...baseIndex,...collectionRecords,...requestRecords,...mantraPracticeRecord].filter(item=>item&&item.route&&item.titleEn);
  const types=[...new Set(index.map(x=>x.kind))].sort();type.innerHTML='<option value="All">All content</option>'+types.map(x=>`<option>${e(x)}</option>`).join('');
  const render=()=>{
   const query=q.value.trim(),terms=n(query).split(/\s+/).filter(Boolean),selected=type.value;
   const found=index.filter(x=>selected==='All'||x.kind===selected).map(x=>({...x,_score:terms.length?score(x,terms):1})).filter(x=>x._score>0).sort((a,b)=>b._score-a._score||String(a.titleEn).localeCompare(String(b.titleEn))).slice(0,60);
   results.innerHTML=found.length?found.map(x=>`<article class="card result"><span class="pill">${e(x.kind)}</span>${x.status?`<span class="pill">${e(x.status)}</span>`:''}<h2 lang="ta">${e(x.titleTa)}</h2><h3>${e(x.titleEn)}</h3><p>${e(x.summary)}</p><a class="btn" href="${e(x.route)}">Open</a></article>`).join(''):'<div class="card">No governed result matched. Try a Tamil title, English title, temple, collection or publication state.</div>';
   count.textContent=`${found.length} result${found.length===1?'':'s'} shown from verified and clearly labelled governed records.`;
   if(query){const old=history.get();history.set([query,...old.filter(x=>x!==query)].slice(0,6));}
   const recent=history.get();recentBox.innerHTML=recent.map(x=>`<button type="button" class="pill search-suggestion" data-query="${e(x)}">${e(x)}</button>`).join('');
  };
  form.addEventListener('submit',ev=>{ev.preventDefault();render();results.focus();});
  type.addEventListener('change',render);
  document.addEventListener('click',ev=>{const b=ev.target.closest('[data-query]');if(b){q.value=b.dataset.query;render();}});
  const params=new URLSearchParams(location.search);if(params.has('q'))q.value=params.get('q')||'';render();
 }catch(err){console.error(err);results.innerHTML='<div class="card" role="alert">The local search indexes could not be loaded. Use the Site Directory or Platform Hub.</div>';count.textContent='Search data unavailable.';}
});
})();
