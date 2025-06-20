module.exports = {
  name: 'ready',
  once: true, // 确保只执行一次
  execute(client) {
    // 1. 基础状态设置
    client.user.setPresence({
      activities: [{
        name: '你的指令 | /help',
        type: 'PLAYING' // 也可以是 WATCHING, LISTENING 等
      }],
      status: 'online' // online/idle/dnd/invisible
    });

    // 2. 控制台输出美化
    const { green, white, yellow } = require('chalk');
    const line = green('═'.repeat(30));

    console.log(`\n${line}`);
    console.log(green(` ✅ ${white('Bot 已上线:')} ${yellow(client.user.tag)}`));
    console.log(green(` ⌚ ${white('上线时间:')} ${yellow(new Date().toLocaleString())}`));
    console.log(green(` 📊 ${white('服务器数量:')} ${yellow(client.guilds.cache.size)}`));
    console.log(green(` 👥 ${white('用户数量:')} ${yellow(client.users.cache.size)}`));
    console.log(`${line}\n`);

    // 3. 定时任务示例（每小时更新状态）
    setInterval(() => {
      const serverCount = client.guilds.cache.size;
      client.user.setActivity(` ${serverCount} 个服务器 | /help`, { 
        type: 'WATCHING' 
      });
    }, 3600000); // 1小时 = 3600000ms
  }
};