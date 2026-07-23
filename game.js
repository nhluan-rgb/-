(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const fmt=n=>Number(n||0).toLocaleString('ja-JP');
  let rows=[],loading=false,previousNg=null;

  function localDate(d){
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function getDates(){
    const t=new Date();t.setHours(0,0,0,0);
    const tm=new Date(t);tm.setDate(t.getDate()+1);
    return {today:localDate(t),tomorrow:localDate(tm)};
  }
  function excelDate(v){
    if(!v)return '';
    if(v instanceof Date)return localDate(v);
    if(typeof v==='number')return localDate(new Date(Math.round((v-25569)*86400000)));
    const s=String(v).trim().replaceAll('/','-');
    let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m)return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})$/);
    if(m){const y=m[3].length===2?`20${m[3]}`:m[3];return `${y}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;}
    return s.slice(0,10);
  }
  function normalize(o){
    return {
      id:String(o['製造指示番号']||'').trim(),
      client:String(o['得意先']||'').trim(),
      part:String(o['品番']||'').trim(),
      name:String(o['品名']||'').trim(),
      qty:Number(String(o['数量']||0).replaceAll(',',''))||0,
      shipDate:excelDate(o['出荷日']),
      due:excelDate(o['製造期限']),
      status:String(o['進捗']||'').trim(),
      owner:String(o['担当者']||'').trim()
    };
  }
  const isCancel=s=>String(s||'').includes('ｷｬﾝｾﾙ')||String(s||'').includes('キャンセル');
  const isNg=r=>r.shipDate===getDates().today&&r.status!=='完成'&&!isCancel(r.status);
  const isOverdue=r=>r.due&&r.due<getDates().today&&r.status!=='完成'&&!isCancel(r.status);

  function updateClock(){
    const now=new Date();
    $('clock').textContent=now.toLocaleTimeString('ja-JP',{hour12:false});
    $('date').textContent=now.toLocaleDateString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'});
  }
  function startKey(){return `battleStart:${getDates().today}`;}
  function completeKey(){return `battleComplete:${getDates().today}`;}
  function getStart(current){
    const saved=Number(localStorage.getItem(startKey())||0);
    if(!saved||current>saved)localStorage.setItem(startKey(),String(Math.max(current,1)));
    return Math.max(Number(localStorage.getItem(startKey())||current),current,1);
  }
  function getCompleteTime(ng){
    if(ng>0){localStorage.removeItem(completeKey());return null;}
    let saved=localStorage.getItem(completeKey());
    if(!saved){saved=new Date().toISOString();localStorage.setItem(completeKey(),saved);}
    return new Date(saved);
  }
  function renderGoal(ng){
    const box=$('goalBox'),slogan=$('bottomSlogan');
    box.style.background='linear-gradient(#0c63b6,#064682)';
    if(ng>0){
      slogan.innerHTML='📣 今日もみんなで力を合わせよう！ <strong>15:00までの全件完成を目指そう！</strong> 💪';
      getCompleteTime(ng); return;
    }
    const t=getCompleteTime(0),before=t.getHours()<15;
    if(before){
      box.style.background='linear-gradient(#2ca968,#157645)';
      slogan.innerHTML='😊 🎉 今日の目標達成！ <strong>15時前に全件完成しました！</strong> お疲れ様でした！';
    }else{
      box.style.background='linear-gradient(#e69932,#b76212)';
      slogan.innerHTML='😌 今日もお疲れ様でした。 <strong>明日も頑張りましょう！</strong> 🌱';
    }
  }

  function processCounts(ngRows){
    const order=['CAD/CAM','切断','曲げ','溶接','仕上','塗装','組立'];
    return order.map(name=>({name,count:ngRows.filter(r=>r.status===name).length}));
  }

  function renderBattle(ngRows){
    const processes=processCounts(ngRows);
    const max=Math.max(...processes.map(x=>x.count),1);

    $('monsterStack').innerHTML=Array.from({length:Math.min(ngRows.filter(r=>r.status==='未着手').length,12)},()=>'<img src="assets/monster.png" alt="">').join('');

    $('processRow').innerHTML=processes.map(p=>{
      const workerCount=Math.min(Math.max(p.count?Math.ceil(p.count/3):0,0),6);
      const workers=p.count===0?'<div style="font-size:42px;color:#2e8b57;font-weight:900">✓</div>':
        Array.from({length:workerCount},()=>'<img src="assets/worker.png" alt="">').join('');
      return `<div class="process-col">
        <div class="speech">
          <div class="name">${p.name}</div>
          <div class="count">${fmt(p.count)}件</div>
          <div class="mini-track"><div class="mini-fill" style="width:${p.count/max*100}%"></div></div>
        </div>
        <div class="workers">${workers}</div>
      </div>`;
    }).join('');

    const total=rows.length,complete=rows.filter(r=>r.status==='完成').length,ng=ngRows.length;
    $('totalCount').textContent=`${fmt(total)}件`;
    $('completeCount').textContent=`${fmt(complete)}件`;
    $('ngCountBottom').textContent=`${fmt(ng)}件`;

    const flowData=[
      {name:'未完成',count:ng,img:'monster.png'},
      ...processes.map(p=>({name:p.name,count:p.count,img:'worker.png'})),
      {name:'完成',count:complete,img:'castle.png'}
    ];
    $('flow').innerHTML=flowData.map((x,i)=>`<div class="flow-item ${i<flowData.length-1?'flow-arrow':''}">
      <div class="flow-icon"><img src="assets/${x.img}" alt=""></div>
      <div class="flow-label">${x.name}</div>
      <div class="flow-value">${fmt(x.count)}件</div>
    </div>`).join('');
  }

  function fireShot(){
    const field=$('battlefield'),hud=$('bossHud'),layer=$('shotLayer');
    const workers=[...document.querySelectorAll('.workers img')];
    if(!field||!hud||!layer||!workers.length)return;
    const shooter=workers[Math.floor(Math.random()*workers.length)];
    const fr=field.getBoundingClientRect(),sr=shooter.getBoundingClientRect(),hr=hud.getBoundingClientRect();
    const sx=sr.left-fr.left+sr.width*.45,sy=sr.top-fr.top+sr.height*.45;
    const tx=hr.left-fr.left+hr.width*.5,ty=20;
    const dist=tx-sx;
    const bullet=document.createElement('img');
    bullet.src='assets/bullet.png';bullet.className='bullet';
    bullet.style.left=`${sx}px`;bullet.style.top=`${sy}px`;
    bullet.style.setProperty('--dist',`${dist}px`);
    bullet.style.setProperty('--dir',dist<0?'-1':'1');
    layer.appendChild(bullet);
    setTimeout(()=>{
      bullet.remove();
      const ex=document.createElement('img');
      ex.src='assets/explosion.png';ex.className='explosion';
      ex.style.left=`${tx}px`;ex.style.top=`${ty}px`;
      layer.appendChild(ex);
      hud.classList.remove('boss-hit');void hud.offsetWidth;hud.classList.add('boss-hit');
      setTimeout(()=>{ex.remove();hud.classList.remove('boss-hit');},560);
    },620);
  }

  function refreshFilters(){
    const statuses=[...new Set(rows.map(r=>r.status).filter(Boolean))];
    const owners=[...new Set(rows.map(r=>r.owner).filter(Boolean))];
    $('statusFilter').innerHTML='<option value="">すべての進捗</option>'+statuses.map(x=>`<option>${x}</option>`).join('');
    $('ownerFilter').innerHTML='<option value="">すべての担当者</option>'+owners.map(x=>`<option>${x}</option>`).join('');
  }
  function renderTable(){
    const q=$('search').value.toLowerCase(),s=$('statusFilter').value,o=$('ownerFilter').value;
    const list=rows.filter(r=>(!q||[r.id,r.client,r.part,r.name].join(' ').toLowerCase().includes(q))&&(!s||r.status===s)&&(!o||r.owner===o));
    $('resultCount').textContent=`${fmt(list.length)}件`;
    $('displaySummary').textContent=`${fmt(list.length)}件`;
    $('tbody').innerHTML=list.slice(0,500).map(r=>`<tr>
      <td>${r.id}</td><td>${r.client}</td><td><b>${r.part}</b><br><small>${r.name}</small></td>
      <td>${fmt(r.qty)}点</td><td>${r.shipDate||'—'}</td><td>${r.due||'—'}</td><td>${r.status||'未設定'}</td><td>${r.owner||'未設定'}</td>
    </tr>`).join('')||'<tr><td colspan="8" style="text-align:center;padding:35px">該当データなし</td></tr>';
  }

  function render(){
    const d=getDates(),ngRows=rows.filter(isNg),today=rows.filter(r=>r.shipDate===d.today),tomorrow=rows.filter(r=>r.shipDate===d.tomorrow),over=rows.filter(isOverdue);
    const ng=ngRows.length,points=ngRows.reduce((a,r)=>a+r.qty,0),start=getStart(ng);

    $('ngSummary').textContent=`${fmt(ng)}件（${fmt(points)}点）`;
    $('todaySummary').textContent=`${fmt(today.length)}件（${fmt(today.reduce((a,r)=>a+r.qty,0))}点）`;
    $('tomorrowSummary').textContent=`${fmt(tomorrow.length)}件（${fmt(tomorrow.reduce((a,r)=>a+r.qty,0))}点）`;
    $('overdueSummary').textContent=`${fmt(over.length)}件（${fmt(over.reduce((a,r)=>a+r.qty,0))}点）`;

    $('bossCount').textContent=fmt(ng);
    $('hpText').textContent=`${fmt(ng)}/${fmt(start)}`;
    $('hpFill').style.width=`${Math.min(100,ng/start*100)}%`;
    renderGoal(ng);
    renderBattle(ngRows);

    if(previousNg!==null&&ng<previousNg)setTimeout(fireShot,150);
    previousNg=ng;

    refreshFilters();
    renderTable();
  }

  async function loadCsv(show=true){
    if(loading)return;loading=true;
    try{
      const res=await fetch('SCV.csv?ts='+Date.now(),{cache:'no-store'});
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      const buf=await res.arrayBuffer();
      let txt=new TextDecoder('shift-jis').decode(buf);
      if(!txt.includes('製造指示番号'))txt=new TextDecoder('utf-8').decode(buf);
      txt=txt.replace(/^\uFEFF/,'');
      const book=XLSX.read(txt,{type:'string',raw:true});
      const sheet=book.Sheets[book.SheetNames[0]];
      const raw=XLSX.utils.sheet_to_json(sheet,{defval:'',raw:true});
      const loaded=raw.map(normalize).filter(r=>r.id||r.name);
      if(!loaded.length)throw new Error('データなし');
      rows=loaded;render();
      if(show)$('notice').textContent=`✓ SCV.csv から ${fmt(rows.length)}件を読み込みました。30秒ごとに自動更新します。`;
    }catch(e){
      console.error(e);
      if(show)$('notice').textContent='⚠ SCV.csv を読み込めません。';
    }finally{loading=false;}
  }

  ['search','statusFilter','ownerFilter'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',renderTable));
  $('refreshBtn').addEventListener('click',()=>loadCsv(true));
  setInterval(updateClock,1000);
  setInterval(()=>loadCsv(false),30000);
  updateClock();
  loadCsv(true);
})();