const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ================= 설정 =================
const MAX_TIME = 20;      // 최대 시도 시간 (초)
const CHECK_DELAY = 700; // 닉네임 체크 간격 (ms)
// =======================================

// ---------- 닉네임 생성 ----------
function randomNick(length, prefix = "") {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let res = "";
  for (let i = 0; i < length; i++) {
    res += chars[Math.floor(Math.random() * chars.length)];
  }
  return prefix + res;
}

// ---------- 비밀번호 생성 ----------
function randomPassword() {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const special = "@!&*";

  let pass = "";
  pass += upper[Math.floor(Math.random() * upper.length)];
  pass += special[Math.floor(Math.random() * special.length)];

  const all = lower + upper + numbers + special;
  for (let i = 0; i < 8; i++) {
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
    // 존재하면 data.data.length === 1
    // 없으면 data.data.length === 0
    return data.data.length === 0;
  } catch {
    return false;
  }
}

// ---------- READY ----------
client.once("ready", () => {
  console.log(`로그인됨: ${client.user.tag}`);
});

// ---------- 명령어 처리 ----------
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "생성") return;

  const length = interaction.options.getInteger("길이") ?? 6;
  const nekoToggle = interaction.options.getBoolean("neko") ?? false;

  if (length < 4 || length > 20) {
    return interaction.reply({
      content: "길이는 4~20자만 가능함",
      ephemeral: true
    });
  }

  const prefix = nekoToggle ? "NEKO" : "";

  if (prefix.length + length > 20) {
    return interaction.reply({
      content: "NEKO 포함 시 총 길이가 20자를 초과함",
      ephemeral: true
    });
  }

  let elapsed = 0;
  let foundNick = null;

  const searching = new EmbedBuilder()
    .setTitle("닉네임 찾는 중...")
    .setDescription("경과 시간: 0초")
    .setColor(0xffaa00);

  await interaction.reply({ embeds: [searching], ephemeral: true });

  const timer = setInterval(async () => {
    elapsed++;
    searching.setDescription(`경과 시간: ${elapsed}초`);
    try {
      await interaction.editReply({ embeds: [searching] });
    } catch {}
  }, 1000);

  const start = Date.now();

  while ((Date.now() - start) / 1000 < MAX_TIME) {
    const nick = randomNick(length, prefix);
    if (await isAvailable(nick)) {
      foundNick = nick;
      break;
    }
    await new Promise(r => setTimeout(r, CHECK_DELAY));
  }

  clearInterval(timer);

  if (!foundNick) {
    const fail = new EmbedBuilder()
      .setTitle("❌ 생성 실패")
      .setDescription("20초 동안 시도했지만\n사용 가능한 닉네임을 찾지 못했습니다.")
      .setColor(0xff0000);

    return interaction.editReply({ embeds: [fail] });
  }

  const password = randomPassword();

  const done = new EmbedBuilder()
    .setTitle("✅ 생성 완료")
    .setColor(0x57f287)
    .setDescription("생성 완료되었습니다. 디엠을 확인하세요.");

  await interaction.editReply({ embeds: [done] });

  await interaction.user.send(
`🎯 **로블록스 닉네임 생성기**

닉네임: \`${foundNick}\`
비밀번호: \`${password}\`

⚠️ 반드시 직접 생성하세요`
  );
});

// ---------- 슬래시 명령어 등록 ----------
const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
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
                description: "닉네임 글자 수 (4~20)",
                type: 4,
                required: false,
                min_value: 4,
                max_value: 20
              },
              {
                name: "neko",
                description: "NEKO 접두사 붙이기",
                type: 5,
                required: false
              }
            ]
          }
        ]
      }
    );
    console.log("슬래시 명령어 등록 완료");
  } catch (e) {
    console.error(e);
  }
})();

client.login(TOKEN);
