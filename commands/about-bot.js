const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('about-bot')
    .setDescription('🌸 關於幽幽子Bot的祕密'),

  async execute(interaction) {
    const botAvatar = interaction.client.user.displayAvatarURL({ dynamic: true });
    const embed = new EmbedBuilder()
      .setColor(0xB4A7D6) // 幽幽子主題紫
      .setTitle('【🦋】西行寺家專用通訊系統')
      .setDescription([
        '> *「想知道冥界的運作原理嗎？呵呵~」*',
        '',
        '**✨ 版本**: `Yuyuko_bot-y2 (JS版)`',
        '**🍵 功能**: 亡靈管理 | 現世娛樂 | 境界維持',
        '**📜 開發者**: (Miya253)[https://github.com/Shiroko253]',
        '',
        '```diff',
        '+ 運行環境: Node.js',
        '+ 核心庫: discord.js',
        '```'
      ].join('\n'))
      .setThumbnail(botAvatar)
      .setFooter({ 
        text: '「問題請用櫻餅賄賂妖夢」', 
        iconURL: 'https://i.imgur.com/WkLQe3H.png' // 妖夢頭像
      });

    await interaction.reply({ embeds: [embed] });
  }
};
