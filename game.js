(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const fmt = n => Number(n || 0).toLocaleString('ja-JP');
  let rows = [];
  let loading = false;
  let previousNg = null;

  function localDate(d){
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }

  function dates(){
    const t=new Date(); t.setHours(0,0,0,0);
    const tm=new Date(t); tm.setDate(t.getDate()+1);
    return {today:localDate(t),tomorrow:localDate(tm)};
  }

  function excelDate(v){
    if(!v)return '';
    if(v instanceof Date)return localDate(v);
    if(typeof v==='number'){
      const d=new Date(Math.round((v-25569)*86400000));
      return localDate(d);
    }
    const s=String(v).trim().replaceAll('/','-');
    let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m)return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})$/);
    if(m){
      const y=m[3].length===2?`20${m[3]}`:m[3];
      return `${y}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
    }
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

  const isCancel = s => String(s||'').includes('ｷｬﾝｾﾙ') || String(s||'').includes('キャンセル');
  const todayNg = r => r.shipDate===dates().today && r.status!=='完成' && !isCancel(r.status);
  const overdue = r => r.due && r.due<dates().today && r.status!=='完成' && !isCancel(r.status);

  function updateClock(){
    const now=new Date();
    $('clock').textContent=now.toLocaleTimeString('ja-JP',{hour12:false});
    $('date').textContent=now.toLocaleDateString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'});
  }

  function startKey(){return `gameStart:${dates().today}`;}
  function completionKey(){return `gameComplete:${dates().today}`;}

  function getStartCount(current){
    const saved=Number(localStorage.getItem(startKey())||0);
    if(!saved || current>saved)localStorage.setItem(startKey(),String(Math.max(current,1)));
    return Math.max(Number(localStorage.getItem(startKey())||current),current,1);
  }

  function completionTime(ng){
    if(ng>0){localStorage.removeItem(completionKey());return null;}
    let saved=localStorage.getItem(completionKey());
    if(!saved){saved=new Date().toISOString();localStorage.setItem(completionKey(),saved);}
    return new Date(saved);
  }

  function renderBanner(ng){
    const b=$('banner'),m=$('bannerMessage');
    b.classList.remove('success','late');
    if(ng>0){
      m.innerHTML='📣 今日もみんなで力を合わせよう！<br>🔥 15:00までの全件完成を目指そう！💪';
      completionTime(ng);
      return;
    }
    const doneAt=completionTime(0);
    const before15=doneAt.getHours()<15;
    b.classList.add(before15?'success':'late');
    m.innerHTML=before15
      ? '😊 🎉 今日の目標達成！<br>15時前に全件完成しました！ お疲れ様でした！'
      : '😌 今日もお疲れ様でした。<br>目標には届きませんでしたが、明日も頑張りましょう！🌱';
  }

  function fireShot(){
    const battle=$('battle'),worker=$('mainWorker'),boss=$('boss'),layer=$('shotLayer');
    if(!battle||!worker||!boss||!layer)return;
    const br=battle.getBoundingClientRect(),wr=worker.getBoundingClientRect(),bor=boss.getBoundingClientRect();
    const sx=wr.left-br.left+wr.width*.15, sy=wr.top-br.top+wr.height*.45;
    const tx=bor.left-br.left+bor.width*.80, ty=bor.top-br.top+bor.height*.45;
    const dist=tx-sx;

    const bullet=document.createElement('img');
    bullet.src='assets/bullet.png'; bullet.className='bullet';
    bullet.style.left=`${sx}px`; bullet.style.top=`${sy}px`;
    bullet.style.setProperty('--dist',`${dist}px`);
    bullet.style.setProperty('--dir',dist<0?'-1':'1');
    layer.appendChild(bullet);

    setTimeout(()=>{
      bullet.remove();
      const ex=document.createElement('img');
      ex.src='assets/explosion.png'; ex.className='explosion';
      ex.style.left=`${tx}px`; ex.style.top=`${ty}px`;
      layer.appendChild(ex);
      boss.classList.remove('hit'); void boss.offsetWidth; boss.classList.add('hit');
      setTimeout(()=>{ex.remove();boss.classList.remove('hit');},560);
    },620);
  }

  function renderStages(ngRows){
    const order=['未着手','CAD/CAM','切断','曲げ','溶接','仕上','塗装','組立'];
    const icons={'未着手':'👹','CAD/CAM':'🖥️','切断':'⚙️','曲げ':'🪝','溶接':'🔥','仕上':'✨','塗装':'🎨','組立':'🧩'};
    $('stages').innerHTML=order.map(name=>{
      const count=ngRows.filter(r=>r.status===name).length;
      const shown=Math.min(count,20);
      let content='';
      if(count===0) content='<div class="zero">✓</div>';
      else if(name==='未着手') content=Array.from({length:shown},()=>'<img class="monster" src="assets/monster.png" alt="">').join('');
      else content=Array.from({length:shown},()=>'<img class="worker" src="assets/worker.png" alt="">').join('');
      if(count>20)content+=`<div class="more">＋${fmt(count-20)}件</div>`;
      return `<div class="stage ${name==='未着手'?'monster':''}">
        <div class="stage-name">${icons[name]} ${name}</div>
        <div class="stage-count">${fmt(count)}件</div>
        <div class="icons">${content}</div>
      </div>`;
    }).join('')+`<div class="stage goal"><img src="assets/castle.png" alt="完成ゲート"><b>完成ゲート</b></div>`;
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
    const d=dates();
    const ngRows=rows.filter(todayNg);
    const todayRows=rows.filter(r=>r.shipDate===d.today);
    const tomorrowRows=rows.filter(r=>r.shipDate===d.tomorrow);
    const overdueRows=rows.filter(overdue);
    const ng=ngRows.length,points=ngRows.reduce((a,r)=>a+r.qty,0),start=getStartCount(ng);

    $('ngSummary').textContent=`${fmt(ng)}件（${fmt(points)}点）`;
    $('todaySummary').textContent=`${fmt(todayRows.length)}件（${fmt(todayRows.reduce((a,r)=>a+r.qty,0))}点）`;
    $('tomorrowSummary').textContent=`${fmt(tomorrowRows.length)}件（${fmt(tomorrowRows.reduce((a,r)=>a+r.qty,0))}点）`;
    $('overdueSummary').textContent=`${fmt(overdueRows.length)}件（${fmt(overdueRows.reduce((a,r)=>a+r.qty,0))}点）`;

    $('unfinishedCount').textContent=fmt(ng);
    $('bossCount').textContent=fmt(ng);
    $('bossPoints').textContent=fmt(points);
    $('hpText').textContent=`${fmt(ng)}/${fmt(start)}`;
    $('hpFill').style.width=`${Math.min(100,ng/start*100)}%`;
    renderBanner(ng);
    renderStages(ngRows);

    if(previousNg!==null && ng<previousNg)setTimeout(fireShot,120);
    previousNg=ng;

    refreshFilters();
    renderTable();
  }

  async function loadCsv(show=true){
    if(loading)return;
    loading=true;
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
      rows=loaded;
      render();
      if(show)$('notice').textContent=`✓ SCV.csv から ${fmt(rows.length)}件を読み込みました。30秒ごとに自動更新します。`;
    }catch(e){
      console.error(e);
      if(show)$('notice').textContent='⚠ SCV.csv を読み込めません。ファイル名と配置を確認してください。';
    }finally{loading=false;}
  }

  ['search','statusFilter','ownerFilter'].forEach(id=>{
    $(id).addEventListener(id==='search'?'input':'change',renderTable);
  });
  $('refreshBtn').addEventListener('click',()=>loadCsv(true));
  setInterval(updateClock,1000);
  setInterval(()=>loadCsv(false),30000);
  updateClock();
  loadCsv(true);
})();
