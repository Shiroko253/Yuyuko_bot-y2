const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'about-bot',
  description: '關於幽幽子的Bot與祂的世界',
  async execute(message, args) {
    const embed = new EmbedBuilder()
      .setColor(0xFFB7DD)
      .setTitle('🌸 幽幽子的櫻之夢Bot')
      .setDescription(
        '「這裡是幽幽子的專屬Bot，像櫻花一樣靜靜守護著你哦～」\n' +
        `**作者：** [Shiroko253](https://github.com/Shiroko253)\n` +
        `**簡介：** 一個以幽幽子為主題、支持Prefix與Slash指令的Discord Bot。\n` +
        `**主程式語言：** Node.js (Discord.js v14)\n` +
        `**GitHub：** https://github.com/Shiroko253/Yuyuko_bot-y2\n`
      )
      .setFooter({ text: '幽幽子總會在櫻花飄落之時，陪伴你。' });

    await message.reply({ embeds: [embed] });
  }
};
