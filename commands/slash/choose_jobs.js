const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
  data: new SlashCommandBuilder()
    .setName('choose_jobs')
    .setDescription('選擇你的職業！')
    .addStringOption(opt =>
      opt.setName('job').setDescription('你要選擇的職業').setRequired(true)
    ),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle('🌸 錯誤 🌸').setDescription('此指令只能在伺服器中使用哦～').setColor('Red')],
        flags: 64
      });
      return;
    }
    const jobName = interaction.options.getString('job', true);
    const jobs = await loadJson(JOBS_PATH);
    if (!jobs[jobName]) {
      const jobList = Object.keys(jobs).join('、');
      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('🌸 沒有這個職業 🌸').setDescription(`目前可選職業有：\n${jobList}`).setColor('Red')],
        flags: 64
      });
    }

    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const userJobs = await loadJson(USER_JOBS_PATH);

    userJobs[guildId] ??= {};
    userJobs[guildId][userId] = { job: jobName };

    await saveJson(USER_JOBS_PATH, userJobs);

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('🌸 選職成功！🌸')
        .setDescription(`你現在的職業是：**${jobName}**\n\n職業薪資範圍：${jobs[jobName].min} ~ ${jobs[jobName].max}`)
        .setColor('#90ee90')]
    });
  }
};