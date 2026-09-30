(function dateOverridesModule(){
  'use strict';
  const API='https://script.google.com/macros/s/AKfycbwrqLmvtkqj-ydfqwm3lJrgE0-MMAfPE0B7XhSFEi1bXqGxgZj21rLCiSfMR0ro36OZ/exec';
  const CACHE_KEY='shared-date-overrides-v1';
  const state={items:new Map(),ready:false,saving:false};
  const page=/welding/i.test(location.pathname)?'welding':/painting/i.test(location.pathname)?'painting':'index';
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const date=value=>{
    const text=String(value||'').trim().normalize('NFKC');
    const match=text.match(/(\d{4})[\/年.\-](\d{1,2})[\/月.\-](\d{1,2})/);
    return match?`${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`:text.replaceAll('/','-');
  };
  const idKey=value=>String(value||'').normalize('NFKC').trim().toUpperCase();
  const aliases=value=>{
    const raw=idKey(value), set=new Set([raw]);
    const short=raw.match(/^\d{2}-(J.+)-\d{3}$/)?.[1];
    if(short)set.add(short);
    const base=(short||raw).replace(/-\d{3}$/,'');
    set.add(base);
    const simple=base.match(/^J0*(\d+)$/);
    if(simple)set.add(`J${simple[1].padStart(6,'0')}`);
    return [...set].filter(Boolean);
  };
  const lookup=value=>{
    for(const key of aliases(value)){if(state.items.has(key))return state.items.get(key)}
    return null;
  };
  function normalizeRecord(raw){
    const id=idKey(raw?.id||raw?.['製造指示番号']);
    if(!id)return null;
    return {
      id,
      materialDate:date(raw.materialDate||raw.seichibi||raw['生地日']),
      dueDate:date(raw.dueDate||raw.due||raw['製造期限']),
      dispatchDate:date(raw.dispatchDate||raw.shipDate||raw['出荷日']),
      updatedAt:String(raw.updatedAt||raw['更新日時']||''),
      updatedBy:String(raw.updatedBy||raw['更新者']||'')
    };
  }
  function setRecords(records){
    state.items.clear();
    (Array.isArray(records)?records:[]).forEach(raw=>{
      const item=normalizeRecord(raw);if(!item)return;
      aliases(item.id).forEach(key=>state.items.set(key,item));
    });
    const unique=[...new Map([...state.items.values()].map(item=>[item.id,item])).values()];
    localStorage.setItem(CACHE_KEY,JSON.stringify(unique));
  }
  function loadCache(){
    try{setRecords(JSON.parse(localStorage.getItem(CACHE_KEY)||'[]'))}catch(_){setRecords([])}
  }
  function rowId(row){return page==='painting'?row?.['製造指示番号']:row?.id}
  function rememberOriginal(row){
    if(row.__dateOverrideOriginal)return;
    row.__dateOverrideOriginal=page==='painting'
      ? {materialDate:row['生地日']||'',dueDate:row['製造期限']||'',dispatchDate:row['出荷日']||''}
      : page==='welding'
        ? {materialDate:row.shipDate||'',dueDate:row.due||'',dispatchDate:row.dispatchDate||''}
        : {materialDate:row.materialDate||'',dueDate:row.due||'',dispatchDate:row.shipDate||''};
  }
  function applyRow(row){
    if(!row)return row;
    rememberOriginal(row);
    const original=row.__dateOverrideOriginal;
    if(page==='painting'){
      row['生地日']=original.materialDate;row['製造期限']=original.dueDate;row['出荷日']=original.dispatchDate;
    }else if(page==='welding'){
      row.shipDate=original.materialDate;row.due=original.dueDate;row.dispatchDate=original.dispatchDate;
    }else{
      row.materialDate=original.materialDate;row.due=original.dueDate;row.shipDate=original.dispatchDate;
    }
    const item=lookup(rowId(row));
    row.__dateOverride=item||null;
    if(!item)return row;
    if(page==='painting'){
      if(item.materialDate)row['生地日']=item.materialDate;
      if(item.dueDate)row['製造期限']=item.dueDate;
      if(item.dispatchDate)row['出荷日']=item.dispatchDate;
    }else if(page==='welding'){
      if(item.materialDate)row.shipDate=item.materialDate;
      if(item.dueDate)row.due=item.dueDate;
      if(item.dispatchDate)row.dispatchDate=item.dispatchDate;
    }else{
      if(item.materialDate)row.materialDate=item.materialDate;
      if(item.dueDate)row.due=item.dueDate;
      if(item.dispatchDate)row.shipDate=item.dispatchDate;
    }
    return row;
  }
  function currentRows(){
    try{return page==='painting'?paintRows:rows}catch(_){return []}
  }
  function applyAll(){currentRows().forEach(applyRow)}
  function rowForId(id){return currentRows().find(row=>aliases(rowId(row)).some(key=>aliases(id).includes(key)))}
  function valuesOf(row){
    if(!row)return {materialDate:'',dueDate:'',dispatchDate:''};
    return page==='painting'
      ? {materialDate:date(row['生地日']),dueDate:date(row['製造期限']),dispatchDate:date(row['出荷日'])}
      : page==='welding'
        ? {materialDate:date(row.shipDate),dueDate:date(row.due),dispatchDate:date(row.dispatchDate)}
        : {materialDate:date(row.materialDate),dueDate:date(row.due),dispatchDate:date(row.shipDate)};
  }
  function enhanceRows(){
    document.querySelectorAll('tbody tr').forEach(tr=>{
      tr.classList.remove('date-override-row');
      tr.querySelectorAll('.date-override-mark').forEach(node=>node.remove());
      const text=idKey(tr.textContent);
      const item=[...new Map([...state.items.values()].map(x=>[x.id,x])).values()].find(x=>aliases(x.id).some(key=>text.includes(key)));
      if(!item)return;
      tr.classList.add('date-override-row');
      const cell=tr.querySelector('td.code,td.id,td.job-id-cell,td.print-job,td');
      if(cell){
        const mark=document.createElement('button');
        mark.type='button';mark.className='date-override-mark';mark.dataset.dateEdit=item.id;
        mark.title=`手動修正 ${item.updatedAt||''}${item.updatedBy?' / '+item.updatedBy:''}`;
        mark.textContent='✎ 手動修正';cell.appendChild(mark);
      }
    });
    const count=new Set([...state.items.values()].map(item=>item.id)).size;
    const counter=document.getElementById('dateOverrideCount');
    if(counter)counter.textContent=count?`${count}件 修正済`:'修正なし';
  }
  function rerender(){
    applyAll();
    try{render()}catch(_){enhanceRows()}
    setTimeout(enhanceRows,0);
  }
  function jsonp(params={}){
    return new Promise((resolve,reject)=>{
      const callback='__dateOverrideCallback'+Date.now()+Math.floor(Math.random()*10000);
      const script=document.createElement('script');
      const timer=setTimeout(()=>{cleanup();reject(new Error('timeout'))},12000);
      const cleanup=()=>{clearTimeout(timer);delete window[callback];script.remove()};
      window[callback]=data=>{cleanup();resolve(data)};
      script.onerror=()=>{cleanup();reject(new Error('network'))};
      const query=new URLSearchParams({...params,action:'dateOverrides',callback,ts:Date.now()});
      script.src=API+'?'+query.toString();document.head.appendChild(script);
    });
  }
  async function loadRemote(showError=false){
    try{
      const data=await jsonp();
      const records=Array.isArray(data)?data:(data?.dateOverrides||data?.items||[]);
      setRecords(records);state.ready=true;rerender();setStatus('共有データ更新済み');return true;
    }catch(error){
      state.ready=true;rerender();setStatus('共有読込失敗・端末キャッシュ表示中',true);
      if(showError)alert('Google Sheet の日付修正データを読み込めませんでした。Apps Script の DateOverrides 対応を確認してください。');
      return false;
    }
  }
  function setStatus(message,error=false){
    const node=document.getElementById('dateOverrideStatus');if(!node)return;
    node.textContent=message;node.classList.toggle('error',error);
  }
  function buildUi(){
    const style=document.createElement('style');
    style.textContent=`
      .date-override-launch{position:fixed;right:18px;bottom:18px;z-index:9000;border:2px solid #f59e0b;border-radius:999px;padding:11px 17px;background:#fff7d6;color:#713f12;font-weight:1000;box-shadow:0 8px 24px #0004;cursor:pointer}.date-override-launch:hover{transform:translateY(-1px)}
      .date-override-count{margin-left:8px;padding:2px 8px;border-radius:999px;background:#f59e0b;color:#241400;font-size:12px}.date-override-row>td{background:#fff7cc!important}.date-override-row{outline:2px solid #f59e0b;outline-offset:-2px}.date-override-mark{display:inline-flex;margin:3px 0 0 6px;padding:3px 7px;border:1px solid #d97706;border-radius:999px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:1000;cursor:pointer;vertical-align:middle}
      .date-override-backdrop{display:none;position:fixed;inset:0;z-index:10000;background:#07131dcc;align-items:center;justify-content:center;padding:18px}.date-override-backdrop.show{display:flex}.date-override-dialog{width:min(620px,100%);max-height:94vh;overflow:auto;border:2px solid #4dd8ff;border-radius:16px;background:#fff;color:#162735;box-shadow:0 22px 80px #0009}.date-override-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;background:#073b55;color:#fff}.date-override-head h2{margin:0;font-size:21px}.date-override-close{border:0;background:transparent;color:#fff;font-size:28px;cursor:pointer}.date-override-body{padding:20px}.date-override-note{margin:0 0 16px;padding:10px 12px;border-radius:8px;background:#fff7d6;color:#713f12;font-weight:800}.date-override-field{display:grid;gap:6px;margin:12px 0}.date-override-field label{font-weight:900}.date-override-field input{width:100%;box-sizing:border-box;border:1px solid #91a8b6;border-radius:8px;padding:10px 12px;font-size:16px}.date-override-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}.date-override-actions button{border:0;border-radius:8px;padding:11px 16px;font-weight:1000;cursor:pointer}.date-override-save{background:#078a63;color:#fff}.date-override-reset{background:#fee2e2;color:#991b1b}.date-override-cancel{background:#e5e7eb;color:#24313a}#dateOverrideStatus{display:block;margin-top:12px;color:#26734d;font-weight:800}#dateOverrideStatus.error{color:#b91c1c}@media(max-width:700px){.date-override-launch{right:10px;bottom:10px}.date-override-actions{display:grid}.date-override-actions button{width:100%}}
    `;
    document.head.appendChild(style);
    document.body.insertAdjacentHTML('beforeend',`
      <button type="button" class="date-override-launch" id="dateOverrideLaunch">✎ 日付修正 <span class="date-override-count" id="dateOverrideCount">修正なし</span></button>
      <div class="date-override-backdrop" id="dateOverrideModal" aria-hidden="true"><section class="date-override-dialog" role="dialog" aria-modal="true" aria-labelledby="dateOverrideTitle">
        <header class="date-override-head"><h2 id="dateOverrideTitle">日付を手動修正</h2><button type="button" class="date-override-close" data-date-close>×</button></header>
        <form class="date-override-body" id="dateOverrideForm"><p class="date-override-note">保存後は全端末で共有され、集計・期限判定も修正後の日付で再計算されます。修正済み行は黄色と「✎ 手動修正」で表示します。</p>
          <div class="date-override-field"><label for="dateOverrideId">製造指示番号</label><input id="dateOverrideId" list="dateOverrideIds" required autocomplete="off" placeholder="J番号を入力"><datalist id="dateOverrideIds"></datalist></div>
          <div class="date-override-field"><label for="dateOverrideMaterial">生地日</label><input id="dateOverrideMaterial" type="date"></div>
          <div class="date-override-field"><label for="dateOverrideDue">製造期限</label><input id="dateOverrideDue" type="date"></div>
          <div class="date-override-field"><label for="dateOverrideDispatch">出荷日</label><input id="dateOverrideDispatch" type="date"></div>
          <div class="date-override-actions"><button type="button" class="date-override-reset" id="dateOverrideReset">修正を解除</button><button type="button" class="date-override-cancel" data-date-close>キャンセル</button><button type="submit" class="date-override-save" id="dateOverrideSave">Google Sheetへ保存</button></div><small id="dateOverrideStatus"></small>
        </form></section></div>`);
    document.getElementById('dateOverrideLaunch').addEventListener('click',()=>openEditor(''));
    document.querySelectorAll('[data-date-close]').forEach(node=>node.addEventListener('click',closeEditor));
    document.getElementById('dateOverrideModal').addEventListener('click',event=>{if(event.target.id==='dateOverrideModal')closeEditor()});
    document.getElementById('dateOverrideId').addEventListener('change',event=>fillEditor(event.target.value));
    document.getElementById('dateOverrideForm').addEventListener('submit',saveEditor);
    document.getElementById('dateOverrideReset').addEventListener('click',resetEditor);
    document.addEventListener('click',event=>{const button=event.target.closest('[data-date-edit]');if(button){event.preventDefault();openEditor(button.dataset.dateEdit)}});
  }
  function refreshDatalist(){
    const host=document.getElementById('dateOverrideIds');if(!host)return;
    host.innerHTML=currentRows().map(row=>`<option value="${esc(rowId(row))}"></option>`).join('');
  }
  function openEditor(id){
    refreshDatalist();document.getElementById('dateOverrideModal').classList.add('show');document.getElementById('dateOverrideModal').setAttribute('aria-hidden','false');
    fillEditor(id);setTimeout(()=>document.getElementById(id?'dateOverrideMaterial':'dateOverrideId').focus(),0);
  }
  function closeEditor(){document.getElementById('dateOverrideModal').classList.remove('show');document.getElementById('dateOverrideModal').setAttribute('aria-hidden','true')}
  function fillEditor(id){
    const row=rowForId(id), item=lookup(id), values=item||valuesOf(row);
    document.getElementById('dateOverrideId').value=id||'';
    document.getElementById('dateOverrideMaterial').value=date(values.materialDate);
    document.getElementById('dateOverrideDue').value=date(values.dueDate);
    document.getElementById('dateOverrideDispatch').value=date(values.dispatchDate);
    setStatus(item?`修正済み：${item.updatedAt||'日時不明'}${item.updatedBy?' / '+item.updatedBy:''}`:'CSVの現在値を表示中');
  }
  async function post(payload){
    await fetch(API,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams({payload:JSON.stringify(payload)})});
  }
  async function saveEditor(event){
    event.preventDefault();if(state.saving)return;
    const id=idKey(document.getElementById('dateOverrideId').value);
    if(!id||!rowForId(id)){alert('SCV.csv に存在する製造指示番号を入力してください。');return}
    const item={id,materialDate:document.getElementById('dateOverrideMaterial').value,dueDate:document.getElementById('dateOverrideDue').value,dispatchDate:document.getElementById('dateOverrideDispatch').value,updatedAt:new Date().toISOString(),updatedBy:localStorage.getItem('dashboardEditorName')||''};
    state.saving=true;document.getElementById('dateOverrideSave').disabled=true;setStatus('Google Sheetへ保存中…');
    try{
      const unique=[...new Map([...state.items.values()].map(x=>[x.id,x])).values()].filter(x=>x.id!==id);unique.push(item);setRecords(unique);rerender();
      await post({action:'saveDateOverride',dateOverride:item});setStatus('✓ 保存しました。共有データを確認中…');
      await new Promise(resolve=>setTimeout(resolve,1100));await loadRemote(false);closeEditor();
    }catch(_){setStatus('保存できませんでした。接続を確認してください。',true)}finally{state.saving=false;document.getElementById('dateOverrideSave').disabled=false}
  }
  async function resetEditor(){
    const id=idKey(document.getElementById('dateOverrideId').value);if(!id||!lookup(id))return;
    if(!confirm(`${id} の手動修正を解除して、CSVの日付へ戻しますか？`))return;
    setStatus('修正を解除中…');
    try{
      const unique=[...new Map([...state.items.values()].map(x=>[x.id,x])).values()].filter(x=>x.id!==id);setRecords(unique);rerender();
      await post({action:'deleteDateOverride',id});await new Promise(resolve=>setTimeout(resolve,900));await loadRemote(false);closeEditor();
    }catch(_){setStatus('解除できませんでした。接続を確認してください。',true)}
  }
  function patchDashboard(){
    try{
      if(page!=='painting'&&typeof normalize==='function'){
        const originalNormalize=normalize;
        normalize=function(source){return applyRow(originalNormalize(source))};
      }
      if(page==='painting'&&typeof loadText==='function'){
        const originalLoadText=loadText;
        loadText=function(text){originalLoadText(text);applyAll();render()};
      }
      if(typeof render==='function'){
        const originalRender=render;
        render=function(){const result=originalRender.apply(this,arguments);setTimeout(enhanceRows,0);return result};
      }
    }catch(error){console.warn('DateOverrides patch error',error)}
  }
  loadCache();patchDashboard();buildUi();applyAll();rerender();loadRemote(false);
  setInterval(()=>loadRemote(false),30000);
})();
