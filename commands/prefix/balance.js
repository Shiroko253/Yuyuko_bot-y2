const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getEconomy } = require('../../utils/economyUtil');

module.exports = {
  name: 'balance',
  description: '查詢你或其他成員的幽靈幣餘額',
  async execute(message, args) {
    // 取得目標用戶
    let target = message.mentions.users.first();
    if (!target && args[0]) {
      // 支援用 ID 查詢
      target = await message.client.users.fetch(args[0]).catch(() => null);
    }
    if (!target) target = message.author;

    // 權限判斷：查自己不用權限，查他人要管理員
    if (target.id !== message.author.id) {
      const hasPerm = message.member.permissions.has(PermissionsBitField.Flags.ManageGuild);
      if (!hasPerm) {
        return message.reply('只有管理員才能查詢其他成員的幽靈幣餘額喔～');
      }
    }

    const guildId = message.guild.id;
    const userId = target.id;
    const economy = await getEconomy(guildId);
    const balance = economy[userId] || 0;

    const embed = new EmbedBuilder()
      .setColor(0xFFB7DD)
      .setTitle('🌸 幽靈幣餘額查詢')
      .setDescription(
        `「來看看幽幽子的寶物庫吧～」\n` +
        `\n<@${userId}> 目前持有的幽靈幣是：\n\n` +
        `**${balance.toFixed(2)}** 枚幽靈幣`
      )
      .setFooter({ text: '「幽幽子會替你守護好這些幽靈幣的唷！」' });

    await message.reply({ embeds: [embed] });
  }
};