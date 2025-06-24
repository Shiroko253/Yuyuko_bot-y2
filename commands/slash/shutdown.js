const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shutdown')
    .setDescription('讓幽幽子安詳地小憩一下（僅限主人）'),
  async execute(interaction) {
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({ content: '只有幽幽子的主人能讓我休息喔～', ephemeral: true });
    }
    await interaction.reply('🌸 幽幽子要去夢鄉了，櫻花會再次綻放的，再見～');
    process.exit(0);
  }
};