(function(){
  const stages=[
    {key:'100',min:80,boss:'boss_100.png',background:'bg_100.png',name:'凶悪なBOSS',banner:'⚠️ 凶悪なBOSS出現！<br><strong>みんなで力を合わせよう！</strong>'},
    {key:'80',min:60,boss:'boss_80.png',background:'bg_80.png',name:'暴走BOSS',banner:'🔥 順調です！<br><strong>この調子で進めよう！</strong>'},
    {key:'60',min:40,boss:'boss_60.png',background:'bg_60.png',name:'人間化が始まりました',banner:'✨ 希望が見えてきました！<br><strong>一つずつ、確実に。</strong>'},
    {key:'40',min:20,boss:'boss_40.png',background:'bg_40.png',name:'人間に戻りつつある',banner:'💪 あと少し！<br><strong>最後まで力を合わせよう！</strong>'},
    {key:'20',min:0,boss:'boss_20.png',background:'bg_20.png',name:'ほぼ人間',banner:'🏃 ゴールは目前！<br><strong>全員でラストスパート！</strong>'},
    {key:'0',min:-1,boss:'boss_0.png',background:'bg_0.png',name:'人間 完成',banner:'🏆 人間完成！<br><strong>今日のミッション達成！</strong>'}
  ];

  const commonLines=[
    '一人ひとりの力が、大きな成果につながります。',
    '仲間と力を合わせれば、必ずゴールに届きます。',
    '今日の努力が、明日の成長につながります。',
    '小さな一歩の積み重ねが、大きな成功をつくります。',
    '一つずつ、確実に。みんななら必ずできます。',
    '焦らず、丁寧に。最高の品質を目指しましょう。',
    '誰かの頑張りが、次の工程を支えています。',
    '最後まで気を抜かず、みんなで笑顔のゴールへ。',
    '今日も仲間への感謝を忘れずに進みましょう。',
    'あなたの一件が、チーム全体を前へ進めます。',
    '苦しい時こそ、声を掛け合って乗り越えよう。',
    'みんなの頑張りは、必ず結果に表れます。'
  ];

  const stageLines={
    '100':['強敵出現！今日も全員で挑戦しよう。','スタートが大切。安全第一で力を合わせよう。'],
    '80':['良い流れです。この調子を保ちましょう。','着実に前進中。次の一件へつなげよう。'],
    '60':['希望が見えてきました。あと半分です。','人間化が始まりました。努力が形になっています。'],
    '40':['ゴールが近づいています。最後まで集中しよう。','あと少し。仲間を信じて進みましょう。'],
    '20':['ゴールは目前！全員でラストスパート！','最後の一件まで、丁寧に仕上げよう。'],
    '0':['人間完成！今日も本当にお疲れ様でした。']
  };

  function getStage(hp){
    const value=Math.max(0,Math.min(100,Number(hp)||0));
    if(value===0)return stages[5];
    return stages.find(stage=>value>stage.min)||stages[5];
  }

  let timer=null;
  let index=0;
  let currentKey='';
  function stop(){
    if(timer){clearInterval(timer);timer=null;}
  }
  function start(element,stage,hp){
    if(!element||!stage)return;
    const key=stage.key||String(Math.round(hp));
    if(currentKey!==key){index=0;currentKey=key;}
    const lines=[...(stageLines[key]||[]),...commonLines];
    const render=()=>{
      const line=lines[index%lines.length];
      element.innerHTML=`📣 ${stage.name}<br><strong>${line}</strong>`;
      index+=1;
    };
    stop();
    render();
    timer=setInterval(render,10000);
  }

  window.BossEvolution={stages,getStage};
  window.BossMotivation={start,stop};
})();
