const fs = require('fs').promises;
const path = require('path');

const economyDir = path.resolve(__dirname, '../economys');

async function ensureEconomyFile(guildId) {
  const filePath = path.join(economyDir, `${guildId}.json`);
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(economyDir, { recursive: true });
    await fs.writeFile(filePath, '{}', 'utf8');
  }
  return filePath;
}

async function getEconomy(guildId) {
  const filePath = await ensureEconomyFile(guildId);
  const data = await fs.readFile(filePath, 'utf8');
  return JSON.parse(data);
}

async function setEconomy(guildId, data) {
  const filePath = await ensureEconomyFile(guildId);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { getEconomy, setEconomy };