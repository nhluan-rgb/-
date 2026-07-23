(function(){
  const stages=[
    {key:'100',min:80,boss:'boss_100.png',background:'bg_100.png',name:'凶悪なBOSS',message:'⚠️ 強敵出現！<br>みんなで力を合わせよう！',banner:'⚠️ 凶悪なBOSS出現！<br><strong>みんなで力を合わせて倒そう！</strong>'},
    {key:'80',min:60,boss:'boss_80.png',background:'bg_80.png',name:'暴走BOSS',message:'🔥 順調です！<br>この調子で攻撃を続けよう！',banner:'🔥 順調です！<br><strong>この調子で攻撃を続けよう！</strong>'},
    {key:'60',min:40,boss:'boss_60.png',background:'bg_60.png',name:'人間化が始まりました',message:'✨ 希望が見えてきました！<br>あと半分！',banner:'✨ 人間化が始まりました！<br><strong>希望が見えてきました！</strong>'},
    {key:'40',min:20,boss:'boss_40.png',background:'bg_40.png',name:'人間に戻りつつある',message:'💪 あと少し！<br>最後まで気を抜かず頑張ろう！',banner:'💪 あと少し！<br><strong>最後まで気を抜かず頑張ろう！</strong>'},
    {key:'20',min:0,boss:'boss_20.png',background:'bg_20.png',name:'ほぼ人間',message:'🏃 ゴールは目前！<br>全員でラストスパート！',banner:'🏃 ゴールは目前！<br><strong>全員でラストスパート！</strong>'},
    {key:'0',min:-1,boss:'boss_0.png',background:'bg_0.png',name:'人間 完成',message:'🎉 みんなの力で進化完了！<br>お疲れ様でした！',banner:'🏆 人間完成！<br><strong>今日のミッション達成！</strong>'}
  ];
  function getStage(hp){
    const value=Math.max(0,Math.min(100,Number(hp)||0));
    if(value===0)return stages[5];
    return stages.find(stage=>value>stage.min)||stages[5];
  }
  window.BossEvolution={stages,getStage};
})();
