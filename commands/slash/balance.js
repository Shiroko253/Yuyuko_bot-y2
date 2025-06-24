const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getEconomy } = require('../../utils/economyUtil');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('查詢你或其他成員的幽靈幣餘額')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('要查詢的成員（留空則查自己）')
        .setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;

    // 權限判斷
    if (user.id !== interaction.user.id) {
      const hasPerm = interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild);
      if (!hasPerm) {
        return interaction.reply({ content: '只有管理員才能查詢其他成員的幽靈幣餘額喔～', ephemeral: true });
      }
    }

    const guildId = interaction.guild.id;
    const userId = user.id;
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

    await interaction.reply({ embeds: [embed] });
  }
};