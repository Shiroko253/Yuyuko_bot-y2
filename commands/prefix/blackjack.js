const { EmbedBuilder } = require('discord.js');
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
  name: 'blackjack',
  description: '幽幽子與你共舞一場21點遊戲～ !blackjack <金額>',
  async execute(message, args) {
    if (!message.guild) {
      return message.reply({ embeds: [new EmbedBuilder().setTitle('🌸 錯誤 🌸').setDescription('請在伺服器中使用').setColor('Red')] });
    }
    let bet;
    try {
      bet = new Decimal(args[0]).toDecimalPlaces(2);
    } catch {
      return message.reply({ embeds: [new EmbedBuilder().setTitle('🌸 無效的賭注 🌸').setDescription('賭注必須是正數').setColor('Red')] });
    }
    if (bet.isNaN() || bet.lte(0)) {
      return message.reply({ embeds: [new EmbedBuilder().setTitle('🌸 無效的賭注 🌸').setDescription('賭注必須是正數').setColor('Red')] });
    }
    const guildId = message.guild.id;
    const userId = message.author.id;
    const BALANCE_PATH = path.join(ECONOMY_DIR, `${guildId}.json`);
    const [balance, userJobs, blackjackData] = await Promise.all([
      loadJson(BALANCE_PATH),
      loadJson(USER_JOBS_PATH),
      loadJson(BLACKJACK_PATH)
    ]);
    const userBalance = new Decimal(balance[userId] ?? 0).toDecimalPlaces(2);
    if (userBalance.lt(bet)) {
      return message.reply({ embeds: [new EmbedBuilder().setTitle('🌸 幽靈幣不足 🌸').setDescription(`你的幽靈幣只有 ${userBalance.toFixed(2)} 哦～`).setColor('Red')] });
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

    let playerTotal = calculateHand(playerCards);
    if (playerTotal === 21) {
      blackjackData[guildId][userId].gameStatus = 'ended';
      await saveJson(BLACKJACK_PATH, blackjackData);
      const multiplier = isGambler ? 5 : 2.5;
      const reward = bet.times(multiplier).toDecimalPlaces(2);
      balance[userId] = new Decimal(balance[userId] ?? 0).plus(reward).toDecimalPlaces(2).toNumber();
      await saveJson(BALANCE_PATH, balance);
      return message.reply({
        embeds: [new EmbedBuilder()
          .setTitle('🌸 黑傑克！靈魂的勝利！🌸')
          .setDescription(`你的手牌：${handString(playerCards)}\n幽幽子為你獻上 ${reward.toFixed(2)} 幽靈幣的祝福～`)
          .setColor('Gold')
        ]
      });
    }

    let desc = `你下注了 **${bet.toFixed(2)} 幽靈幣**\n你的手牌：${handString(playerCards)} (總點數：${playerTotal})\n幽幽子的明牌：${dealerCards[0]}\n\n請在 2 分鐘內於頻道回覆：\n\`hit\`（抽牌）、\`stand\`（停牌）、\`double\`（雙倍下注）`;
    await message.reply({ embeds: [new EmbedBuilder().setTitle('🌸 21點開局！🌸').setDescription(desc).setColor('#FFB6C1')] });

    // 等待用戶回覆
    const filter = reply => reply.author.id === userId && ['hit', 'stand', 'double'].includes(reply.content.toLowerCase());
    const collector = message.channel.createMessageCollector({ filter, time: 2 * 60 * 1000 });

    collector.on('collect', async reply => {
      const bjDataAll = await loadJson(BLACKJACK_PATH);
      const balAll = await loadJson(BALANCE_PATH);
      const bj = bjDataAll[guildId]?.[userId];
      if (!bj || bj.gameStatus === 'ended') {
        collector.stop();
        return reply.reply({ embeds: [new EmbedBuilder().setTitle('🌸 遊戲已結束 🌸').setColor('Red')] });
      }
      let action = reply.content.toLowerCase();
      if (action === 'hit') {
        bj.playerCards.push(bj.deck.pop());
        const total = calculateHand(bj.playerCards);
        if (total > 21) {
          bj.gameStatus = 'ended';
          await saveJson(BLACKJACK_PATH, bjDataAll);
          collector.stop();
          return reply.reply({ embeds: [new EmbedBuilder().setTitle('🌸 哎呀，靈魂爆掉了！🌸').setDescription(`你的手牌：${handString(bj.playerCards)}\n點數總計：${total}`).setColor('Red')] });
        }
        if (total === 21) {
          bj.gameStatus = 'ended';
          const multiplier = bj.isGambler ? 5 : 2.5;
          const reward = new Decimal(bj.bet).times(multiplier).toDecimalPlaces(2);
          balAll[userId] = new Decimal(balAll[userId] ?? 0).plus(reward).toDecimalPlaces(2).toNumber();
          await saveJson(BALANCE_PATH, balAll);
          await saveJson(BLACKJACK_PATH, bjDataAll);
          collector.stop();
          return reply.reply({ embeds: [new EmbedBuilder().setTitle('🌸 黑傑克！靈魂的勝利！🌸').setDescription(`你的手牌：${handString(bj.playerCards)}\n幽幽子為你獻上 ${reward.toFixed(2)} 幽靈幣的祝福～`).setColor('Gold')] });
        }
        await saveJson(BLACKJACK_PATH, bjDataAll);
        return reply.reply({ embeds: [new EmbedBuilder().setTitle('🌸 你抽了一張牌！🌸').setDescription(`你的手牌：${handString(bj.playerCards)}\n目前點數：${calculateHand(bj.playerCards)}`).setColor('#FFB6C1')] });
      } else if (action === 'double') {
        if (bj.doubleDownUsed) {
          return reply.reply({ embeds: [new EmbedBuilder().setTitle('🌸 無法再次雙倍下注！🌸').setColor('Red')] });
        }
        if (new Decimal(balAll[userId] ?? 0).lt(bj.bet)) {
          return reply.reply({ embeds: [new EmbedBuilder().setTitle('🌸 幽靈幣不足 🌸').setColor('Red')] });
        }
        balAll[userId] = new Decimal(balAll[userId] ?? 0).minus(bj.bet).toDecimalPlaces(2).toNumber();
        bj.bet = new Decimal(bj.bet).times(2).toDecimalPlaces(2).toNumber();
        bj.doubleDownUsed = true;
        if (bj.deck.length) {
          bj.playerCards.push(bj.deck.pop());
        } else {
          bj.gameStatus = 'ended';
          collector.stop();
          await saveJson(BLACKJACK_PATH, bjDataAll);
          return reply.reply({ embeds: [new EmbedBuilder().setTitle('🌸 牌組已耗盡 🌸').setColor('Red')] });
        }
        // 直接進入結算
        action = 'stand';
      }
      if (action === 'stand') {
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
          balAll[userId] = new Decimal(balAll[userId] ?? 0).plus(reward).toDecimalPlaces(2).toNumber();
          resultEmbed.setTitle('🌸 靈魂的勝利！🌸').setDescription(`你的手牌：${handString(bj.playerCards)}\n幽幽子的手牌：${handString(bj.dealerCards)}\n你贏得了 ${reward.toFixed(2)} 幽靈幣～`).setColor('Gold');
        } else if (playerTotal === dealerTotal) {
          reward = new Decimal(bj.bet).toDecimalPlaces(2);
          balAll[userId] = new Decimal(balAll[userId] ?? 0).plus(reward).toDecimalPlaces(2).toNumber();
          resultEmbed.setTitle('🌸 平手，靈魂的平衡～ 🌸').setDescription(`你的手牌：${handString(bj.playerCards)}\n幽幽子的手牌：${handString(bj.dealerCards)}\n退還賭注：${reward.toFixed(2)} 幽靈幣`).setColor('#FFB6C1');
        } else {
          resultEmbed.setTitle('🌸 殞地，幽幽子贏了！🌸').setDescription(`你的手牌：${handString(bj.playerCards)}\n幽幽子的手牌：${handString(bj.dealerCards)}\n下次再來挑戰吧～`).setColor('Red');
        }
        await saveJson(BALANCE_PATH, balAll);
        await saveJson(BLACKJACK_PATH, bjDataAll);
        collector.stop();
        return reply.reply({ embeds: [resultEmbed] });
      }
    });

    collector.on('end', async (_, reason) => {
      const bjData = await loadJson(BLACKJACK_PATH);
      if (bjData[guildId]?.[userId]?.gameStatus === 'ongoing') {
        const bal = await loadJson(BALANCE_PATH);
        const bet = new Decimal(bjData[guildId][userId].bet).toDecimalPlaces(2);
        bal[userId] = new Decimal(bal[userId] ?? 0).plus(bet).toDecimalPlaces(2).toNumber();
        bjData[guildId][userId].gameStatus = 'ended';
        await saveJson(BALANCE_PATH, bal);
        await saveJson(BLACKJACK_PATH, bjData);
        message.channel.send({ embeds: [new EmbedBuilder().setTitle('🌸 遊戲超時，靈魂休息了～ 🌸').setDescription(`時間到，退還賭注 ${bet.toFixed(2)} 幽靈幣`).setColor('Blue')] });
      }
    });
  }
};