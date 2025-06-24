const { EmbedBuilder } = require('discord.js');
const { getEconomy, setEconomy } = require('../../utils/economyUtil');

module.exports = {
  name: 'addmoney',
  description: '給指定成員加上幽靈幣~（僅限Bot主人）',
  async execute(message, args) {
    if (message.author.id !== process.env.OWNER_ID) {
      return message.reply('只有幽幽子的主人才能使用這個咒術喔～');
    }

    const target = message.mentions.users.first();
    const amountRaw = args.find(arg => /^\d+(\.\d{1,2})?$/.test(arg));
    const amount = amountRaw ? parseFloat(parseFloat(amountRaw).toFixed(2)) : null;

    if (!target || !amount || isNaN(amount) || amount <= 0) {
      return message.reply('幽幽子飄來提醒：請標註成員並輸入正確的金額哦～ 例如：`!addmoney @小明 100.00`');
    }

    const guildId = message.guild.id;
    const userId = target.id;
    const economy = await getEconomy(guildId);

    economy[userId] = (economy[userId] || 0) + amount;
    await setEconomy(guildId, economy);

    const embed = new EmbedBuilder()
      .setColor(0xFFB7DD)
      .setTitle('🌸 幽靈幣悄悄飛來～')
      .setDescription(`幽幽子為 <@${userId}> 增添了 **${amount.toFixed(2)}** 枚幽靈幣！\n\n` +
        `現有幽靈幣：**${economy[userId].toFixed(2)}**`)
      .setFooter({ text: '「幽靈幣也會隨櫻花飄舞呢～」' });

    await message.reply({ embeds: [embed] });
  }
};