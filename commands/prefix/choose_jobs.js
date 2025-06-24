const { EmbedBuilder } = require('discord.js');
const { readFile, writeFile, mkdir } = require('fs/promises');
const path = require('path');
const fs = require('fs');

const CONFIG_DIR = path.resolve('config');
const JOBS_PATH = path.join(CONFIG_DIR, 'jobs.json');
const USER_JOBS_PATH = path.join(CONFIG_DIR, 'user-jobs.json');

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) await mkdir(dir, { recursive: true });
}
async function loadJson(file) {
  try {
    await ensureDir(path.dirname(file));
    const raw = await readFile(file, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
async function saveJson(file, data) {
  await ensureDir(path.dirname(file));
  await writeFile(file, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = {
  name: 'choose_jobs',
  description: '選擇你的職業！!choose_jobs <職業名稱>',
  async execute(message, args) {
    if (!message.guild) {
      return message.reply({ embeds: [new EmbedBuilder().setTitle('🌸 錯誤 🌸').setDescription('請在伺服器中使用').setColor('Red')] });
    }

    const jobs = await loadJson(JOBS_PATH);
    const jobsListEmbed = new EmbedBuilder()
      .setTitle('🌸 可選擇的職業一覽 🌸')
      .setColor('#ADD8E6')
      .setDescription(
        Object.entries(jobs)
          .map(([name, data]) => `**${name}**\n預期工資：${data.min} ~ ${data.max}`)
          .join('\n\n')
      );

    // 如果沒帶參數，只顯示職業列表
    if (!args[0]) {
      return message.reply({ embeds: [jobsListEmbed] });
    }

    const jobName = args[0];
    if (!jobs[jobName]) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🌸 沒有這個職業 🌸')
            .setDescription('請參考下方職業列表。'),
          jobsListEmbed
        ]
      });
    }

    const guildId = message.guild.id;
    const userId = message.author.id;
    const userJobs = await loadJson(USER_JOBS_PATH);

    userJobs[guildId] ??= {};
    userJobs[guildId][userId] = { job: jobName };

    await saveJson(USER_JOBS_PATH, userJobs);

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🌸 選職成功！🌸')
          .setDescription(`你現在的職業是：**${jobName}**\n\n職業薪資範圍：${jobs[jobName].min} ~ ${jobs[jobName].max}`),
        jobsListEmbed
      ]
    });
  }
};