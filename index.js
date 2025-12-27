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

// 닉네임 생성 시발
function randomNick(length, prefix = "") {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let res = "";
  for (let i = 0; i < length; i++) {
    res += chars[Math.floor(Math.random() * chars.length)];
  }
  return prefix + res;
}

// 비밀번호 생성
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

client.once("ready", () => {
  console.log(`로그인됨: ${client.user.tag}`);
});

// 명령어 처리
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "생성") return;

  const length = interaction.options.getInteger("길이") ?? 6;
  const nekoToggle = interaction.options.getBoolean("neko") ?? false;

  // 로블록스 제한
  if (length < 4 || length > 20) {
    return interaction.reply({
      content: "길이는 4~20자만 가능함",
      ephemeral: true
    });
  }

  const prefix = nekoToggle ? "NEKO" : "";

  // 접두사 포함해서 20자 초과 방지
  if (prefix.length + length > 20) {
    return interaction.reply({
      content: "NEKO 포함 시 총 길이가 20자를 초과함",
      ephemeral: true
    });
  }

  let seconds = 0;

  const embed = new EmbedBuilder()
    .setTitle("닉네임 생성기")
    .setDescription("닉네임 찾는 중...")
    .setColor(0x2f3136);

  await interaction.reply({ embeds: [embed], ephemeral: true });

  const interval = setInterval(async () => {
    seconds++;
    embed.setDescription(`닉네임 찾는 중... (${seconds}초)`);
    await interaction.editReply({ embeds: [embed] });

    if (seconds >= Math.floor(Math.random() * 4) + 4) {
      clearInterval(interval);

      const nick = randomNick(length, prefix);
      const password = randomPassword();

      const done = new EmbedBuilder()
        .setTitle("생성 완료")
        .setColor(0x57f287)
        .addFields(
          { name: "닉네임", value: `\`${nick}\`` },
          { name: "길이", value: `${length}자`, inline: true },
          { name: "NEKO", value: nekoToggle ? "ON" : "OFF", inline: true },
          { name: "비밀번호", value: `\`${password}\`` },
          { name: "소요 시간", value: `${seconds}초` }
        );

      try {
        await interaction.user.send({ embeds: [done] });
        await interaction.editReply({
          embeds: [
            embed.setDescription("생성 완료되었습니다. 디엠을 확인하세요.")
          ]
        });
      } catch {
        await interaction.editReply({
          embeds: [
            embed.setDescription("DM 차단돼 있음")
          ]
        });
      }
    }
  }, 1000);
});

// 슬래시 명령어 등록
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
                type: 4, // INTEGER
                required: false,
                min_value: 4,
                max_value: 20
              },
              {
                name: "neko",
                description: "NEKO 접두사 붙이기",
                type: 5, // BOOLEAN
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
