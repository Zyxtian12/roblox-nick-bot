const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  EmbedBuilder,
  REST,
  Routes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const fetch = require('node-fetch');

// ================= 설정 =================
const MAX_TIME = 20;          // 최대 시도 시간 (초)
const CHECK_DELAY = 600;      // 닉 체크 간격 (ms)
const UNDERSCORE_RATE = 0.6;  // _ 등장 확률
// =======================================

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
});

// ---------- 유틸 ----------
const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

// _ 최대 1개, 앞/뒤 금지
function generateNick(length, neko) {
  let baseLength = neko ? length - 4 : length;
  if (baseLength < 3) return null;

  let nick = '';
  let underscoreIndex = -1;

  if (Math.random() < UNDERSCORE_RATE) {
    underscoreIndex = Math.floor(Math.random() * (baseLength - 2)) + 1;
  }

  for (let i = 0; i < baseLength; i++) {
    if (i === underscoreIndex) nick += '_';
    else nick += randomChar();
  }

  return neko ? `NEKO${nick}` : nick;
}

// ---------- 비밀번호 ----------
function generatePassword(length = 14) {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const nums = '0123456789';
  const special = '@!&*';
  const all = upper + lower + nums + special;

  let pass =
    upper[Math.floor(Math.random() * upper.length)] +
    special[Math.floor(Math.random() * special.length)];

  while (pass.length < length) {
    pass += all[Math.floor(Math.random() * all.length)];
  }

  return pass.split('').sort(() => Math.random() - 0.5).join('');
}

// ---------- Roblox 닉 체크 ----------
async function isAvailable(username) {
  try {
    const res = await fetch(
      'https://users.roblox.com/v1/usernames/validate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          birthday: '2000-01-01',
          context: 'Signup',
        }),
      }
    );
    const data = await res.json();
    return data.code === 0;
  } catch {
    return false;
  }
}

// ---------- 슬래시 명령 ----------
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('패널')
      .setDescription('로블록스 닉네임 생성 패널')
      .toJSON(),
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );
  console.log('슬래시 명령어 등록 완료');
}

// ---------- READY ----------
client.once('ready', async () => {
  console.log(`로그인됨: ${client.user.tag}`);
  await registerCommands();
});

// ---------- 인터랙션 ----------
client.on('interactionCreate', async interaction => {

  /* /패널 */
  if (interaction.isChatInputCommand() && interaction.commandName === '패널') {
    const embed = new EmbedBuilder()
      .setTitle('🎮 Roblox Nick Generator')
      .setDescription('버튼을 눌러 닉네임을 생성하세요')
      .setColor(0x5865f2);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('open_modal')
        .setLabel('닉네임 생성')
        .setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({ embeds: [embed], components: [row] });
  }

  /* 버튼 */
  if (interaction.isButton() && interaction.customId === 'open_modal') {
    const modal = new ModalBuilder()
      .setCustomId('nick_modal')
      .setTitle('닉네임 생성');

    const lengthInput = new TextInputBuilder()
      .setCustomId('length')
      .setLabel('닉네임 길이 (4~20)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const nekoInput = new TextInputBuilder()
      .setCustomId('neko')
      .setLabel('NEKO 접두사? (true / false)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(lengthInput),
      new ActionRowBuilder().addComponents(nekoInput)
    );

    return interaction.showModal(modal);
  }

  /* 모달 */
  if (interaction.isModalSubmit() && interaction.customId === 'nick_modal') {
    const length = parseInt(interaction.fields.getTextInputValue('length'));
    const neko =
      interaction.fields.getTextInputValue('neko')?.toLowerCase() === 'true';

    if (isNaN(length) || length < 4 || length > 20) {
      return interaction.reply({ content: '❌ 길이는 4~20만 가능', ephemeral: true });
    }

    let elapsed = 0;
    let found = null;

    const embed = new EmbedBuilder()
      .setTitle('닉네임 찾는 중...')
      .setDescription('경과 시간: 0초')
      .setColor(0xffaa00);

    await interaction.reply({ embeds: [embed] });

    const timer = setInterval(async () => {
      elapsed++;
      embed.setDescription(`경과 시간: ${elapsed}초`);
      try { await interaction.editReply({ embeds: [embed] }); } catch {}
    }, 1000);

    const start = Date.now();

    while ((Date.now() - start) / 1000 < MAX_TIME) {
      const nick = generateNick(length, neko);
      if (nick && await isAvailable(nick)) {
        found = nick;
        break;
      }
      await new Promise(r => setTimeout(r, CHECK_DELAY));
    }

    clearInterval(timer);

    if (!found) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ 생성 실패')
            .setDescription('20초 동안 시도했지만\n닉네임을 찾지 못했습니다.')
            .setColor(0xff0000)
        ]
      });
    }

    const password = generatePassword();

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ 생성 완료')
          .setDescription(`총 소요 시간: ${elapsed}초\nDM을 확인하세요`)
          .setColor(0x00ff88)
      ]
    });

    await interaction.user.send(
`🎯 **로블록스 계정 생성 정보**

닉네임: \`${found}\`
비밀번호: \`${password}\`

⚠️ 반드시 직접 변경하세요`
    );
  }
});

client.login(process.env.TOKEN);
