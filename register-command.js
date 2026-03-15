// Run this ONCE to register the /meal slash command with Discord
// node register-command.js

const BOT_TOKEN = "YOUR_BOT_TOKEN_HERE";
const APPLICATION_ID = "YOUR_APPLICATION_ID_HERE";

const command = {
  name: "meal",
  description: "Log a meal or insulin dose to your health tracker",
  options: [
    {
      name: "log",
      description: 'What you ate or took — e.g. "had maggi and chai, took 6 units"',
      type: 3, // STRING type
      required: true,
    },
  ],
};

async function registerCommand() {
  const response = await fetch(
    `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    }
  );

  const data = await response.json();

  if (response.ok) {
    console.log("✅ /meal command registered successfully!");
    console.log("Command ID:", data.id);
  } else {
    console.error("❌ Failed to register command:", data);
  }
}

registerCommand();
