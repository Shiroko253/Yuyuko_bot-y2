const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ping',
  description: '🌸 測量冥界與現世的通訊延遲',
  cooldown: 5,
  
  // 斜線指令的選項定義 (可選)
  options: [],

  async execute(interaction) {
    // --- 防禦：確保能回覆指令 ---
    if (!interaction.channel.permissionsFor(interaction.client.user).has('SendMessages')) {
      return interaction.client.logger.log(`[錯誤] 無法在頻道 ${interaction.channel.name} 發送訊息`);
    }

    // --- 延遲檢測 ---
    const PING_TIMES = 3;
    let totalBotLatency = 0;
    let totalAPILatency = 0;

    // 先回覆「檢測中」的 ephemeral 訊息 (只有指令使用者能看到)
    await interaction.reply({ 
      content: '🦋 正在派遣冥蝶收集數據...', 
      ephemeral: true 
    });

    // --- 多次檢測 ---
    for (let i = 0; i < PING_TIMES; i++) {
      const startTime = Date.now();
      await interaction.channel.sendTyping(); // 模擬打字狀態
      totalBotLatency += Date.now() - startTime;
      totalAPILatency += interaction.client.ws.ping;
    }

    // --- 計算平均延遲 ---
    const avgBotLatency = Math.round(totalBotLatency / PING_TIMES);
    const avgAPILatency = Math.round(totalAPILatency / PING_TIMES);

    // --- 根據延遲生成評語 ---
    const latencyComment = 
      avgAPILatency < 100 ? '「冥界的網路今天特別順暢呢~ (◕‿◕)」' :
      avgAPILatency < 300 ? '「嗯~ 還算可以接受的程度喔 (端起茶杯)」' :
      '「冥蝶似乎迷路了... 要來點櫻餅安慰嗎? (´;ω;`)」';

    // --- 建立 Embed 回覆 ---
    const embed = new EmbedBuilder()
      .setColor(0xFFB6C1)
      .setTitle('🌸 冥界通訊品質報告書')
      .setDescription([
        `**✨ 平均反應速度**: \`${avgBotLatency}ms\``,
        `**🦋 Discord 彼岸延遲**: \`${avgAPILatency}ms\``,
        `**📊 檢測次數**: \`${PING_TIMES} 次\``,
        `\n${latencyComment}`
      ].join('\n'))
      .setFooter({ text: `檢測時間: ${new Date().toLocaleString()}` })
      .setThumbnail(interaction.client.user.displayAvatarURL());

    // --- 最終回覆 ---
    await interaction.editReply({ 
      content: '', 
      embeds: [embed],
      ephemeral: false // 改成所有人可見
    });
  },

  // --- 斜線指令註冊設定 (可選) ---
  register: {
    name: 'ping',
    description: '測量與冥界的通訊延遲',
    options: [] // 可添加參數選項
  }
};