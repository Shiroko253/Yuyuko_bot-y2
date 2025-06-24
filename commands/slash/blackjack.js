const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const { readFile, writeFile, mkdir } = require('fs/promises');
const path = require('path');
const fs = require('fs');
const Decimal = require('decimal.js');

const CONFIG_DIR = path.resolve('config');
const ECONOMY_DIR = path.resolve('economys');
const BLACKJACK_PATH = path.join(CONFIG_DIR, 'blackjack_data.json');
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
function createDeck() {
  return [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'].flatMap(card => Array(4).fill(card));
}
function calculateHand(cards) {
  let value = 0, aces = 0;
  for (const card of cards) {
    if (['J', 'Q', 'K'].includes(String(card))) value += 10;
    else if (card === 'A') { aces++; value += 11; }
    else value += Number(card);
  }
  while (value > 21 && aces) { value -= 10; aces--; }
  return value;
}
function handString(cards) {
  return cards.map(c => {
    if (c === 'A') return 'A';
    if (c === 'J') return 'J';
    if (c === 'Q') return 'Q';
    if (c === 'K') return 'K';
    return c;
  }).join(', ');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('幽幽子與你共舞一場21點遊戲～')
    .addNumberOption(opt => opt.setName('bet').setDescription('下注金額').setRequired(true)),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle('🌸 錯誤 🌸').setDescription('此指令只能在伺服器中使用哦～').setColor('Red')],
        flags: 64
      });
      return;
    }
    let bet;
    try {
      bet = new Decimal(interaction.options.getNumber('bet', true)).toDecimalPlaces(2);
    } catch {
      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('🌸 無效的賭注 🌸').setDescription('賭注必須大於 0 喔～').setColor('Red')],
        flags: 64
      });
    }
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const BALANCE_PATH = path.join(ECONOMY_DIR, `${guildId}.json`);
    const [balance, userJobs, blackjackData] = await Promise.all([
      loadJson(BALANCE_PATH),
      loadJson(USER_JOBS_PATH),
      loadJson(BLACKJACK_PATH)
    ]);
    const userBalance = new Decimal(balance[userId] ?? 0).toDecimalPlaces(2);
    if (bet.lte(0)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('🌸 無效的賭注 🌸').setDescription('賭注必須大於 0 喔～').setColor('Red')],
        flags: 64
      });
    }
    if (userBalance.lt(bet)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('🌸 幽靈幣不足 🌸').setDescription(`你的幽靈幣只有 ${userBalance.toFixed(2)}，無法下注 ${bet.toFixed(2)} 哦～`).setColor('Red')],
        flags: 64
      });
    }
    const isGambler = userJobs[guildId]?.[userId]?.job === '賭徒';
    const deck = createDeck().sort(() => Math.random() - 0.5);
    const playerCards = [deck.pop(), deck.pop()];
    const dealerCards = [deck.pop(), deck.pop()];
    balance[userId] = userBalance.minus(bet).toDecimalPlaces(2).toNumber();
    await saveJson(BALANCE_PATH, balance);

    blackjackData[guildId] ??= {};
    blackjackData[guildId][userId] = {
      playerCards,
      dealerCards,
      deck,
      bet: bet.toNumber(),
      gameStatus: 'ongoing',
      doubleDownUsed: false,
      isGambler
    };
    await saveJson(BLACKJACK_PATH, blackjackData);

    const playerTotal = calculateHand(playerCards);
    if (playerTotal === 21) {
      blackjackData[guildId][userId].gameStatus = 'ended';
      await saveJson(BLACKJACK_PATH, blackjackData);
      const multiplier = isGambler ? 5 : 2.5;
      const reward = bet.times(multiplier).toDecimalPlaces(2);
      balance[userId] = new Decimal(balance[userId] ?? 0).plus(reward).toDecimalPlaces(2).toNumber();
      await saveJson(BALANCE_PATH, balance);
      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('🌸 黑傑克！靈魂的勝利！🌸').setDescription(`你的手牌：${handString(playerCards)}\n幽幽子為你獻上 ${reward.toFixed(2)} 幽靈幣的祝福～`).setColor('Gold')],
        flags: 64
      });
    }

    const startEmbed = new EmbedBuilder()
      .setTitle('🌸 幽幽子的21點遊戲開始！🌸')
      .setDescription(`你下注了 **${bet.toFixed(2)} 幽靈幣**\n\n你的初始手牌：${handString(playerCards)} (總點數：${playerTotal})\n幽幽子的明牌：${dealerCards[0]}`)
      .setColor('#FFB6C1')
      .setFooter({ text: '選擇你的命運吧～' });

    const hitBtn = new ButtonBuilder().setCustomId('hit').setLabel('抽牌').setStyle(ButtonStyle.Primary);
    const standBtn = new ButtonBuilder().setCustomId('stand').setLabel('停牌').setStyle(ButtonStyle.Danger);
    const doubleBtn = new ButtonBuilder().setCustomId('double').setLabel('雙倍下注').setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(hitBtn, standBtn, doubleBtn);

    const msg = await interaction.reply({ embeds: [startEmbed], components: [row], flags: 64, fetchReply: true });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3 * 60 * 1000 });

    collector.on('collect', async btnInt => {
      if (btnInt.user.id !== userId) {
        await btnInt.reply({ content: '這不是你的遊戲哦～', flags: 64 });
        return;
      }
      await btnInt.deferUpdate();
      const data = await loadJson(BLACKJACK_PATH);
      const bal = await loadJson(BALANCE_PATH);
      const bj = data[guildId]?.[userId];
      if (!bj || bj.gameStatus === 'ended') {
        await btnInt.editReply({
          embeds: [new EmbedBuilder().setTitle('🌸 遊戲已結束 🌸').setDescription('這場遊戲已經結束了哦～').setColor('Red')],
          components: []
        });
        return;
      }
      if (!bj.deck.length) {
        bj.gameStatus = 'ended';
        await saveJson(BLACKJACK_PATH, data);
        await btnInt.editReply({
          embeds: [new EmbedBuilder().setTitle('🌸 牌組已耗盡 🌸').setDescription('牌組已用完，遊戲結束。請重新開始一場新遊戲～').setColor('Red')],
          components: []
        });
        return;
      }
      if (btnInt.customId === 'hit') {
        bj.playerCards.push(bj.deck.pop());
        const total = calculateHand(bj.playerCards);
        if (total > 21) {
          bj.gameStatus = 'ended';
          await saveJson(BLACKJACK_PATH, data);
          await btnInt.editReply({
            embeds: [new EmbedBuilder().setTitle('🌸 哎呀，靈魂爆掉了！🌸').setDescription(`你的手牌：${handString(bj.playerCards)}\n點數總計：${total}`).setColor('Red')],
            components: []
          });
          return;
        }
        if (total === 21) {
          bj.gameStatus = 'ended';
          const multiplier = bj.isGambler ? 5 : 2.5;
          const reward = new Decimal(bj.bet).times(multiplier).toDecimalPlaces(2);
          bal[userId] = new Decimal(bal[userId] ?? 0).plus(reward).toDecimalPlaces(2).toNumber();
          await saveJson(BALANCE_PATH, bal);
          await saveJson(BLACKJACK_PATH, data);
          await btnInt.editReply({
            embeds: [new EmbedBuilder().setTitle('🌸 黑傑克！靈魂的勝利！🌸').setDescription(`你的手牌：${handString(bj.playerCards)}\n幽幽子為你獻上 ${reward.toFixed(2)} 幽靈幣的祝福～`).setColor('Gold')],
            components: []
          });
          return;
        }
        await saveJson(BLACKJACK_PATH, data);
        await btnInt.editReply({
          embeds: [new EmbedBuilder().setTitle('🌸 你抽了一張牌！🌸').setDescription(`你的手牌：${handString(bj.playerCards)}\n目前點數：${calculateHand(bj.playerCards)}`).setColor('#FFB6C1')],
          components: [new ActionRowBuilder().addComponents(hitBtn, standBtn, bj.doubleDownUsed ? doubleBtn.setDisabled(true) : doubleBtn)]
        });
      } else if (btnInt.customId === 'stand' || btnInt.customId === 'double') {
        let bet = new Decimal(bj.bet).toDecimalPlaces(2);
        if (btnInt.customId === 'double') {
          if (bj.doubleDownUsed) {
            await btnInt.editReply({
              embeds: [new EmbedBuilder().setTitle('🌸 無法再次雙倍下注！🌸').setColor('Red')],
              components: []
            });
            return;
          }
          if (new Decimal(bal[userId] ?? 0).lt(bet)) {
            await btnInt.editReply({
              embeds: [new EmbedBuilder().setTitle('🌸 幽靈幣不足 🌸').setDescription(`你的幽靈幣只有 ${new Decimal(bal[userId] ?? 0).toFixed(2)}，不足以雙倍下注哦～`).setColor('Red')],
              components: [row]
            });
            return;
          }
          bal[userId] = new Decimal(bal[userId] ?? 0).minus(bet).toDecimalPlaces(2).toNumber();
          bj.bet = bet.times(2).toDecimalPlaces(2).toNumber();
          bj.doubleDownUsed = true;
          if (bj.deck.length) {
            bj.playerCards.push(bj.deck.pop());
          } else {
            bj.gameStatus = 'ended';
            await saveJson(BLACKJACK_PATH, data);
            await btnInt.editReply({
              embeds: [new EmbedBuilder().setTitle('🌸 牌組已耗盡 🌸').setDescription('牌組已用完，無法雙倍下注。遊戲結束～').setColor('Red')],
              components: []
            });
            return;
          }
        }
        bj.gameStatus = 'ended';
        while (calculateHand(bj.dealerCards) < 17 && bj.deck.length) {
          bj.dealerCards.push(bj.deck.pop());
        }
        const playerTotal = calculateHand(bj.playerCards);
        const dealerTotal = calculateHand(bj.dealerCards);
        let resultEmbed = new EmbedBuilder();
        let reward = new Decimal(0);
        const winMultiplier = bj.isGambler ? 4 : 2;
        if (dealerTotal > 21 || playerTotal > dealerTotal) {
          reward = new Decimal(bj.bet).times(winMultiplier).toDecimalPlaces(2);
          bal[userId] = new Decimal(bal[userId] ?? 0).plus(reward).toDecimalPlaces(2).toNumber();
          resultEmbed.setTitle('🌸 靈魂的勝利！🌸').setDescription(`你的手牌：${handString(bj.playerCards)}\n幽幽子的手牌：${handString(bj.dealerCards)}\n你贏得了 ${reward.toFixed(2)} 幽靈幣～`).setColor('Gold');
        } else if (playerTotal === dealerTotal) {
          reward = new Decimal(bj.bet).toDecimalPlaces(2);
          bal[userId] = new Decimal(bal[userId] ?? 0).plus(reward).toDecimalPlaces(2).toNumber();
          resultEmbed.setTitle('🌸 平手，靈魂的平衡～ 🌸').setDescription(`你的手牌：${handString(bj.playerCards)}\n幽幽子的手牌：${handString(bj.dealerCards)}\n退還賭注：${reward.toFixed(2)} 幽靈幣`).setColor('#FFB6C1');
        } else {
          resultEmbed.setTitle('🌸 殞地，幽幽子贏了！🌸').setDescription(`你的手牌：${handString(bj.playerCards)}\n幽幽子的手牌：${handString(bj.dealerCards)}\n下次再來挑戰吧～`).setColor('Red');
        }
        await saveJson(BALANCE_PATH, bal);
        await saveJson(BLACKJACK_PATH, data);
        await btnInt.editReply({ embeds: [resultEmbed], components: [] });
      }
    });

    collector.on('end', async () => {
      const data = await loadJson(BLACKJACK_PATH);
      if (data[guildId]?.[userId]?.gameStatus === 'ongoing') {
        const bal = await loadJson(BALANCE_PATH);
        const bet = new Decimal(data[guildId][userId].bet).toDecimalPlaces(2);
        bal[userId] = new Decimal(bal[userId] ?? 0).plus(bet).toDecimalPlaces(2).toNumber();
        data[guildId][userId].gameStatus = 'ended';
        await saveJson(BALANCE_PATH, bal);
        await saveJson(BLACKJACK_PATH, data);
        try {
          await interaction.editReply({
            embeds: [new EmbedBuilder().setTitle('🌸 遊戲超時，靈魂休息了～ 🌸').setDescription(`時間到了，退還你的賭注 ${bet.toFixed(2)} 幽靈幣，下次再來挑戰幽幽子吧！`).setColor('Blue')],
            components: []
          });
        } catch {}
      }
    });
  }
};