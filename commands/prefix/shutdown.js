module.exports = {
  name: 'shutdown',
  description: '讓幽幽子安詳地小憩一下（僅限主人）',
  async execute(message, args) {
    if (message.author.id !== process.env.OWNER_ID) {
      return message.reply('只有幽幽子的主人能讓我休息喔～');
    }
    await message.reply('🌸 幽幽子要去夢鄉了，櫻花會再次綻放的，再見～');
    process.exit(0);
  }
};