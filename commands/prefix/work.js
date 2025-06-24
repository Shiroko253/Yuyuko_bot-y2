const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const economyDir = path.resolve(__dirname, '..', '..', 'economys');
const cooldownDir = path.resolve(__dirname, '..', '..', 'cooldowns');
const userJobsPath = path.resolve(__dirname, '..', '..', 'config', 'user-jobs.json');
const jobsPath = path.resolve(__dirname, '..', '..', 'config', 'jobs.json');

if (!fs.existsSync(economyDir)) fs.mkdirSync(economyDir, { recursive: true });
if (!fs.existsSync(cooldownDir)) fs.mkdirSync(cooldownDir, { recursive: true });

// 賭徒專屬語錄
const gamblerQuotes = [
  "蛤 工作 哼哈哈哈 啊哈哈哈 只不過是我賭博的路上的絆脚石 何爲工作 去TMD鳥命工作",
  "哼 工作 就算有一個正直的工作又如何 只不過是我致富發財的絆脚石罷了",
  "工作？有趣 就算是一個正值薪資高的工作 有何用処 只不過是我的絆脚石罷了"
];

function getAllUserJobs() {
  const configDir = path.dirname(userJobsPath);
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true }); // 保證config資料夾存在
  if (!fs.existsSync(userJobsPath)) {
    fs.writeFileSync(userJobsPath, JSON.stringify({}, null, 2));
    return {};
  }
  return JSON.parse(fs.readFileSync(userJobsPath, 'utf8'));
}
function setAllUserJobs(data) {
  fs.writeFileSync(userJobsPath, JSON.stringify(data, null, 2));
}
function getUserJobData(guildId, userId) {
  const allJobs = getAllUserJobs();
  let jobEntry = allJobs[guildId]?.[userId];

  // 如果是舊格式（字串），自動修正為物件格式
  if (typeof jobEntry === "string") {
    jobEntry = { job: jobEntry, stress: 0 };
    if (!allJobs[guildId]) allJobs[guildId] = {};
    allJobs[guildId][userId] = jobEntry;
    setAllUserJobs(allJobs);
  }
  if (!jobEntry || typeof jobEntry.job !== "string") return null;
  if (typeof jobEntry.stress !== "number") jobEntry.stress = 0;
  return jobEntry;
}
function setUserJobData(guildId, userId, jobData) {
  const allJobs = getAllUserJobs();
  if (!allJobs[guildId]) allJobs[guildId] = {};
  allJobs[guildId][userId] = jobData;
  setAllUserJobs(allJobs);
}

// 經濟系統（以用戶ID為key，數字為餘額）
function getEconomyFileName(guildId) {
  return path.join(economyDir, `${guildId}.json`);
}
function getGuildEconomy(guildId) {
  const filePath = getEconomyFileName(guildId);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
    return {};
  }
}
function setGuildEconomy(guildId, guildEco) {
  const filePath = getEconomyFileName(guildId);
  fs.writeFileSync(filePath, JSON.stringify(guildEco, null, 2));
}
function getUserEconomy(guildId, userId) {
  const allEco = getGuildEconomy(guildId);
  if (typeof allEco[userId] !== "number") {
    allEco[userId] = 0;
    setGuildEconomy(guildId, allEco);
  }
  return allEco[userId];
}
function setUserEconomy(guildId, userId, value) {
  const allEco = getGuildEconomy(guildId);
  allEco[userId] = value;
  setGuildEconomy(guildId, allEco);
}

// cooldown
function getCooldownFile(guildId, userId) {
  return path.join(cooldownDir, `${guildId}_${userId}.json`);
}
function getCooldown(guildId, userId) {
  const file = getCooldownFile(guildId, userId);
  if (!fs.existsSync(file)) return null;
  const { lastWork } = JSON.parse(fs.readFileSync(file, 'utf8'));
  return lastWork;
}
function setCooldown(guildId, userId, timestamp) {
  const file = getCooldownFile(guildId, userId);
  fs.writeFileSync(file, JSON.stringify({ lastWork: timestamp }, null, 2));
}

module.exports = {
  name: 'work',
  description: '上班領取工資，有五分鐘冷卻，並會增加壓力值',
  async execute(message) {
    if (!message.guild) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🌸 幽幽子提醒你～')
            .setColor(0xffb7e0)
            .setDescription('只能在伺服器中使用本指令喲～')
        ]
      });
    }
    const guildId = message.guild.id;
    const userId = message.author.id;

    // 職業與壓力
    const jobData = getUserJobData(guildId, userId);
    if (!jobData) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🌸 迷路的靈魂～')
            .setColor(0xffb7e0)
            .setDescription('你尚未選擇職業呢！請先使用 `!choose_jobs` 選擇一份適合你的工作，幽幽子會期待你的表現喲！')
        ]
      });
    }

    // 賭徒彩蛋
    if (jobData.job === '賭徒') {
      const quote = gamblerQuotes[Math.floor(Math.random() * gamblerQuotes.length)];
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🌸 賭徒的靈魂擺爛中 🌸')
            .setColor(0x9b59b6)
            .setDescription(`${quote}\n\n幽幽子：看來你已經走上了賭博之路，工作對你來說已經沒有意義了呢～`)
        ]
      });
    }

    // 檢查冷卻
    const cooldown = getCooldown(guildId, userId);
    const now = Date.now();
    const cooldownTime = 5 * 60 * 1000; // 5分鐘
    if (cooldown && now - cooldown < cooldownTime) {
      const left = Math.ceil((cooldownTime - (now - cooldown)) / 1000);
      const min = Math.floor(left / 60);
      const sec = left % 60;
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🌸 靈魂還在休息喲～')
            .setColor(0xffc300)
            .setDescription(`還要再等 ${min > 0 ? `${min}分` : ''}${sec}秒才能再努力工作一次喔！幽幽子等你一起加油！`)
        ]
      });
    }

    // 讀取職業工資範圍
    if (!fs.existsSync(jobsPath)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🌸 沒有找到職業資料')
            .setColor(0xffb7e0)
            .setDescription('幽幽子找不到職業資料，請聯絡管理員喲～')
        ]
      });
    }
    const jobsData = JSON.parse(fs.readFileSync(jobsPath, 'utf8'));
    const curJob = jobData.job;
    const jobInfo = jobsData[curJob];
    if (!jobInfo) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🌸 職業失蹤了？')
            .setColor(0xffb7e0)
            .setDescription(`你的職業資料異常（職業：${curJob}），請重新選擇職業，幽幽子會守護你的靈魂之路！`)
        ]
      });
    }

    // 隨機工資
    const pay = Math.floor(Math.random() * (jobInfo.max - jobInfo.min + 1)) + jobInfo.min;

    // 經濟 balance
    let balance = getUserEconomy(guildId, userId);
    balance += pay;
    setUserEconomy(guildId, userId, balance);

    // 壓力
    jobData.stress = (jobData.stress ?? 0) + 10;
    setUserJobData(guildId, userId, jobData);

    // 設定冷卻
    setCooldown(guildId, userId, now);

    // 回覆（公開）
    const embed = new EmbedBuilder()
      .setTitle('🌸 幽幽子的靈魂工資袋～')
      .setColor(0xffb7e0)
      .setDescription(
        `你努力工作了一番，幽幽子特地為你準備了 **${pay} 金幣** 💰！\n\n` +
        `目前幽靈幣餘額：**${balance}**\n` +
        `壓力值增加了 10 點（目前壓力：${jobData.stress}）\n\n` +
        `「多勞多得，休息也要記得喲～🌸」`
      )
      .setFooter({ text: `職業：${curJob} ｜ 發薪人：幽幽子` });

    return message.reply({
      embeds: [embed]
    });
  }
};
