const { Client, GatewayIntentBits, Routes, REST, SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// 환경변수
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// 슬래시 명령어 등록
const commands = [
  new SlashCommandBuilder()
    .setName('생성')
    .setDescription('랜덤 Roblox 닉 생성')
    .addIntegerOption(option =>
      option.setName('길이')
        .setDescription('닉네임 글자 수 (4~20)')
        .setRequired(false))
    .addBooleanOption(option =>
      option.setName('neko')
        .setDescription('닉 앞에 NEKO 붙이기')
        .setRequired(false))
];

const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('슬래시 명령어 등록 완료');
  } catch (err) { console.error(err); }
})();

// 랜덤 문자열 생성 (_ 랜덤 포함)
function generateNick(length, neko) {
  let nick = neko ? 'NEKO' : '';
  const remaining = length - nick.length;
  for (let i = 0; i < remaining; i++) {
    let char;
    if (Math.random() < 0.05) { // 5% 확률로 _
      char = '_';
    } else {
      char = 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)];
    }
    nick += char;
  }
  return nick;
}

// Roblox API로 사용 가능 여부 확인
async function isNickAvailable(nick) {
  const res = await fetch('https://users.roblox.com/v1/usernames/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: nick, excludeBanned: true })
  });
  const data = await res.json();
  return data.success;
}

client.on('ready', () => {
  console.log(`로그인됨: ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  if (interaction.commandName === '생성') {
    await interaction.reply({ content: '닉 생성 중... 잠시만 기다려주세요', ephemeral: true });

    const length = interaction.options.getInteger('길이') || 6;
    const neko = interaction.options.getBoolean('neko') || false;

    let nick = '';
    let attempts = 0;
    while (attempts < 20) { // 최대 20회 시도
      const candidate = generateNick(length, neko);
      if (await isNickAvailable(candidate)) {
        nick = candidate;
        break;
      }
      attempts++;
    }

    if (!nick) {
      await interaction.followUp({ content: '사용 가능한 닉을 찾지 못했습니다. 글자 수를 늘리거나 다시 시도하세요.', ephemeral: true });
      return;
    }

    const password = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).toUpperCase().slice(2,4) + '!@';
    await interaction.user.send(`생성 완료!\n닉: ${nick}\n비밀번호: ${password}`);
    await interaction.followUp({ content: '생성 완료! DM을 확인하세요.', ephemeral: true });
  }
});

client.login(TOKEN);
