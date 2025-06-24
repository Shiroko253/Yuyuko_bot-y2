const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getEconomy, setEconomy } = require('../../utils/economyUtil');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addmoney')
    .setDescription('給指定成員加上幽靈幣~（僅限Bot主人）')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('要加幽靈幣的成員')
        .setRequired(true))
    .addNumberOption(option =>
      option.setName('amount')
        .setDescription('增加的金額（最多兩位小數）')
        .setRequired(true)),
  async execute(interaction) {
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({ content: '只有幽幽子的主人才能使用這個咒術喔～', flags: MessageFlags.Ephemeral });
    }

    const user = interaction.options.getUser('user');
    let amount = interaction.options.getNumber('amount');
    amount = parseFloat(parseFloat(amount).toFixed(2));

    if (!user || isNaN(amount) || amount <= 0) {
      return interaction.reply({ content: '幽幽子飄來提醒：請選擇成員並輸入正確的金額哦～', flags: MessageFlags.Ephemeral });
    }

    const guildId = interaction.guild.id;
    const userId = user.id;
    const economy = await getEconomy(guildId);

    economy[userId] = (economy[userId] || 0) + amount;
    await setEconomy(guildId, economy);

    const embed = new EmbedBuilder()
      .setColor(0xFFB7DD)
      .setTitle('🌸 幽靈幣悄悄飛來～')
      .setDescription(`幽幽子為 <@${userId}> 增添了 **${amount.toFixed(2)}** 枚幽靈幣！\n\n` +
        `現有幽靈幣：**${economy[userId].toFixed(2)}**`)
      .setFooter({ text: '「幽靈幣也會隨櫻花飄舞呢～」' });

    await interaction.reply({ embeds: [embed] });
  }
};