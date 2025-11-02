import fs from 'fs';

const transcript = fs.readFileSync('/Users/kimseonmin/Desktop/action-visualizer/test_basf_meeting.txt', 'utf-8');

console.log(`📊 テスト開始: ${transcript.length}文字の会議内容`);
console.log(`🔍 重要なキーワード: BASF, 前田, 飯島, 岡崎, 城田, 澤田, 金ソンミン, ザルカ, CS強化`);

const startTime = Date.now();

try {
  const response = await fetch('http://localhost:3000/api/meeting-summary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transcript }),
  });

  const data = await response.json();
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  if (response.ok) {
    console.log(`\n✅ 成功! 処理時間: ${duration}秒\n`);
    console.log('='.repeat(80));
    console.log('【生成された議事録サマリー】');
    console.log('='.repeat(80));
    console.log(`\n目的:\n${data.summary.purpose}\n`);
    console.log(`主な議論:\n${data.summary.discussions.join('\n')}\n`);
    console.log(`決定事項:\n${data.summary.decisions.join('\n')}\n`);

    console.log('='.repeat(80));
    console.log('【TODOリスト】');
    console.log('='.repeat(80));
    data.todos.forEach((todo, i) => {
      console.log(`\n${i + 1}. ${todo.task}`);
      console.log(`   担当者: ${todo.assignee}`);
      console.log(`   優先度: ${todo.priority}`);
      if (todo.deadline) console.log(`   期限: ${todo.deadline}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('【詳細議事録】');
    console.log('='.repeat(80));
    console.log(data.detailedMinutes);
    console.log('\n' + '='.repeat(80));

    // 検証: 重要なキーワードが含まれているか
    const fullText = JSON.stringify(data).toLowerCase();
    const keywords = ['basf', '前田', '飯島', '岡崎', '城田', '澤田', 'ソンミン', 'ザルカ', 'cs'];
    const foundKeywords = keywords.filter(kw => fullText.includes(kw.toLowerCase()));
    const missingKeywords = keywords.filter(kw => !fullText.includes(kw.toLowerCase()));

    console.log('\n📝 検証結果:');
    console.log(`✅ 含まれているキーワード (${foundKeywords.length}/${keywords.length}): ${foundKeywords.join(', ')}`);
    if (missingKeywords.length > 0) {
      console.log(`❌ 含まれていないキーワード: ${missingKeywords.join(', ')}`);
    }

  } else {
    console.error(`\n❌ エラー! 処理時間: ${duration}秒`);
    console.error('ステータス:', response.status);
    console.error('エラー詳細:', JSON.stringify(data, null, 2));
  }
} catch (error) {
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.error(`\n❌ リクエスト失敗! 処理時間: ${duration}秒`);
  console.error('エラー:', error.message);
}
