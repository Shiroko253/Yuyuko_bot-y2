const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

function buildJobListEmbed(jobs, selectedJob = null) {
  return new EmbedBuilder()
    .setTitle('🌸 可選擇的職業一覽 🌸')
    .setColor('#ADD8E6')
    .setDescription(
      Object.entries(jobs)
        .map(([name, data]) =>
          (selectedJob === name ? "👉 " : "") +
          `**${name}**\n薪資範圍：${data.min} ~ ${data.max}${selectedJob === name ? "（已選擇）" : ""}`)
        .join('\n\n')
    );
}

function buildJobSelectMenu(jobs, customId = 'choose_job_select') {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder('請選擇你想要的職業')
      .addOptions(
        Object.entries(jobs)
          .map(([name, data]) => ({
            label: name,
            value: name,
            description: `薪資：${data.min} ~ ${data.max}`
          }))
      )
  );
}

function buildAgainButton(customId = 'choose_job_again') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(customId)
      .setLabel('重新選擇職業')
      .setStyle(ButtonStyle.Secondary)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('choose_jobs')
    .setDescription('選擇你的職業！（請用下拉選單選擇）'),
  async execute(interaction) {
    if (!interaction.guildId) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          embeds: [new EmbedBuilder().setTitle('🌸 錯誤 🌸').setDescription('此指令只能在伺服器中使用哦～').setColor('Red')],
          flags: 64
        });
      }
      return;
    }

    const jobs = await loadJson(JOBS_PATH);

    // 嵌入+選單
    if (!interaction.replied && !interaction.deferred) {
      const embed = buildJobListEmbed(jobs);
      await interaction.reply({
        embeds: [embed],
        components: [buildJobSelectMenu(jobs)],
        flags: 64
      });
    }
  },

  // InteractionCreate 事件專用
  async handleComponent(interaction) {
    const jobs = await loadJson(JOBS_PATH);

    if (interaction.isStringSelectMenu() && interaction.customId === 'choose_job_select') {
      const selected = interaction.values[0];
      if (!jobs[selected]) {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '🌸 選擇的職業不存在，請重新選擇！',
            flags: 64
          });
        }
        return;
      }
      // 存資料
      const guildId = interaction.guildId;
      const userId = interaction.user.id;
      const userJobs = await loadJson(USER_JOBS_PATH);
      userJobs[guildId] ??= {};
      userJobs[guildId][userId] = { job: selected };
      await saveJson(USER_JOBS_PATH, userJobs);

      const embed = buildJobListEmbed(jobs, selected);
      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle('🌸 選職成功！🌸')
            .setDescription(`你現在的職業是：**${selected}**\n職業薪資範圍：${jobs[selected].min} ~ ${jobs[selected].max}\n\n可隨時再次選擇職業。`)
            .setColor('#90ee90'),
          embed
        ],
        components: [buildAgainButton()]
      });
      return;
    }

    if (interaction.isButton() && interaction.customId === 'choose_job_again') {
      const embed = buildJobListEmbed(jobs);
      await interaction.update({
        embeds: [embed],
        components: [buildJobSelectMenu(jobs)]
      });
      return;
    }
  }
};