const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  REST, 
  Routes 
} = require("discord.js");

const TOKEN = process.env.TOKEN; // 토큰은 환경변수
const CLIENT_ID = process.env.CLIENT_ID; // 봇 ID

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// 랜덤 6글자 닉네임
function randomNick() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let res = "";
  for (let i = 0; i < 6; i++) {
    res += chars[Math.floor(Math.random() * chars.length)];
  }
  return res;
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

// 슬래시 명령어 처리
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "생성") return;

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

      const nick = randomNick();
      const password = randomPassword();

      const done = new EmbedBuilder()
        .setTitle("생성 완료")
        .setColor(0x57f287)
        .addFields(
          { name: "닉네임", value: `\`${nick}\`` },
          { name: "비밀번호", value: `\`${password}\`` },
          { name: "소요 시간", value: `${seconds}초` }
        );

      try {
        await interaction.user.send({ embeds: [done] });
        await interaction.editReply({
          embeds: [
            embed.setDescription("완료됨! DM 확인해라")
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
            description: "랜덤 6글자 닉네임 생성"
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
