require('dotenv').config();
const fs = require('fs');
const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const errorLogger = require('./utils/errorlogger');  // 錯誤記錄模組

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

errorLogger.register(client);

// 指令系統擴充 ========================================
client.commands = new Collection();  // 文字指令
client.slashCommands = new Collection();  // 斜線指令

// 載入文字指令 (原有功能保留)
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command.name) client.commands.set(command.name, command);
  
  // 註冊斜線指令設定 (新增)
  if (command.register) {
    client.slashCommands.set(command.register.name, command);
  }
}

// 斜線指令註冊函式 (新增)
async function registerSlashCommands() {
  const commands = [];
  client.slashCommands.forEach(cmd => {
    commands.push({
      name: cmd.register.name,
      description: cmd.register.description,
      options: cmd.register.options || []
    });
  });

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('🔄 正在註冊斜線指令...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ 斜線指令註冊完成！');
  } catch (error) {
    errorLogger.logErrorToJson(error, '[斜線指令註冊失敗]');
    console.error('❌ 指令註冊失敗:', error);
  }
}

// 事件處理 ========================================
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// 新增斜線指令互動監聽 (含錯誤記錄)
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const command = client.slashCommands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    errorLogger.logErrorToJson(error, `[斜線指令錯誤: /${interaction.commandName}]`);
    console.error(error);
    await interaction.reply({ 
      content: '🦋 冥蝶在傳遞指令時迷路了...', 
      ephemeral: true 
    }).catch(() => {});
  }
});

// 啟動機器人 ========================================
client.once('ready', async () => {
  await registerSlashCommands();  // 註冊斜線指令
  console.log(`✅ ${client.user.tag} 已準備好服務冥界居民！`);
});

client.login(process.env.BOT_TOKEN).catch(error => {
  errorLogger.logErrorToJson(error, '[Bot登入失敗]');
});