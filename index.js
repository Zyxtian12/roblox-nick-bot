const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes
} = require("discord.js");

const fetch = require("node-fetch");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// ================= 설정 =================
const MAX_TIME = 30;        // 최대 시도 시간 (초)
const CHECK_DELAY = 600;    // Roblox 체크 간격 (ms)
// =======================================

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ---------- 닉네임 생성 ----------
function generateNick(length, neko) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const prefix = neko ? "NEKO_" : "";

  const baseLength = length - prefix.length;
  if (baseLength < 1) return null;

  let nick = "";
  for (let i = 0; i < baseLength; i++) {
    nick += chars[Math.floor(Math.random() * chars.length)];
  }

  return prefix + nick;
}

// ---------- 비밀번호 생성 ----------
function generatePassword(length = 12) {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const nums = "0123456789";
  const special = "@!&*";
  const all = upper + lower + nums + special;

  let pass =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    nums[Math.floor(Math.random() * nums.length)] +
    special[Math.floor(Math.random() * special.length)];

  while (pass.length < length) {
    pass += all[Math.floor(Math.random() * all.length)];
  }

  return pass.split("").sort(() => Math.random() - 0.5).join("");
}

// ---------- Roblox 닉네임 사용 가능 여부 ----------
async function isAvailable(username) {
  try {
    const res = await fetch(
      "https://users.roblox.com/v1/usernames/users",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernames: [username],
          excludeBannedUsers: false
        })
      }
    );

    const data = await res.json();
    return data.data.length === 0;
  } catch {
    return false;
  }
}

// ---------- READY ----------
client.once("ready", async () => {
  console.log(`로그인됨: ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    {
      body: [
        {
          name: "생성",
          description: "로블록스 닉네임 생성",
          options: [
            {
              name: "길이",
              description: "닉네임 길이 (4~20)",
              type: 4,
              required: false,
              min_value: 4,
              max_value: 20
            },
            {
              name: "neko",
              description: "NEKO_ 접두사 사용",
              type: 5,
              required: false
            }
          ]
        }
      ]
    }
  );

  console.log("슬래시 명령어 등록 완료");
});

// ---------- 명령어 처리 ----------
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "생성") return;

  const length = interaction.options.getInteger("길이") ?? 6;
  const neko = interaction.options.getBoolean("neko") ?? false;

  if (length < 4 || length > 20) {
    return interaction.reply({
      content: "❌ 길이는 4~20만 가능",
      ephemeral: true
    });
  }

  if (neko && length <= 5) {
    return interaction.reply({
      content: "❌ NEKO_ 사용 시 길이를 더 늘려라",
      ephemeral: true
    });
  }

  let elapsed = 0;
  let foundNick = null;

  const embed = new EmbedBuilder()
    .setTitle("닉네임 찾는 중...")
    .setDescription("경과 시간: 0초")
    .setColor(0xffaa00);

  await interaction.reply({ embeds: [embed], ephemeral: true });

  const timer = setInterval(async () => {
    elapsed++;
    embed.setDescription(`경과 시간: ${elapsed}초`);
    try {
      await interaction.editReply({ embeds: [embed] });
    } catch {}
  }, 1000);

  const start = Date.now();

  while ((Date.now() - start) / 1000 < MAX_TIME) {
    const nick = generateNick(length, neko);
    if (!nick) break;

    if (await isAvailable(nick)) {
      foundNick = nick;
      break;
    }

    await new Promise(r => setTimeout(r, CHECK_DELAY));
  }

  clearInterval(timer);

  if (!foundNick) {
    const fail = new EmbedBuilder()
      .setTitle("❌ 실패")
      .setDescription("30초 동안 시도했지만\n사용 가능한 닉네임을 찾지 못했습니다.")
      .setColor(0xff0000);

    return interaction.editReply({ embeds: [fail] });
  }

  const password = generatePassword();

  const done = new EmbedBuilder()
    .setTitle("✅ 생성 완료")
    .setDescription(`총 소요 시간: ${elapsed}초\nDM을 확인하세요`)
    .setColor(0x00ff88);

  await interaction.editReply({ embeds: [done] });

  await interaction.user.send(
`🎯 **로블록스 계정 닉네임 생성**

닉네임: \`${foundNick}\`
비밀번호: \`${password}\`

⚠️ 로그인 후 반드시 비밀번호 변경`
  );
});

client.login(TOKEN);
