const { EmbedBuilder } = require('discord.js');

function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

module.exports = {
  name: 'ping',
  description: '測試幽幽子的靈壓與櫻花飄落的速度。',
  async execute(message, args) {
    const times = 3;
    const wsPings = [];
    const localLatencies = [];

    for (let i = 0; i < times; i++) {
      const wsPing = message.client.ws.ping;
      wsPings.push(wsPing);

      const start = Date.now();
      await message.channel.sendTyping();
      localLatencies.push(Date.now() - start);

      // 稍微間隔
      await new Promise(r => setTimeout(r, 350));
    }

    // 櫻花粉色 #FFB7DD
    const embed = new EmbedBuilder()
      .setColor(0xFFB7DD)
      .setTitle('🌸 幽幽子的櫻花靈壓測試')
      .setDescription(
        `「呼呼，感受到幽幽子的氣息了嗎？」\n` +
        `這裡是靈壓與櫻花飄落的速度測試結果～`
      )
      .addFields(
        {
          name: 'Discord API 延遲 (ms)',
          value: wsPings.map((v, i) => `第${i+1}次：${v}`).join('\n') +
            `\n平均：${average(wsPings).toFixed(1)}`
        },
        {
          name: '本機回應延遲 (ms)',
          value: localLatencies.map((v, i) => `第${i+1}次：${v}`).join('\n') +
            `\n平均：${average(localLatencies).toFixed(1)}`
        }
      )
      .setFooter({ text: '幽幽子的溫柔守候，總在你身旁。' });

    await message.reply({ embeds: [embed] });
  }
};