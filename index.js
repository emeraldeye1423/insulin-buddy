import { verifyKey } from "discord-interactions";

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

export default {
  async fetch(request) {
    if (request.method === "GET") {
      return new Response("Insulin Buddy bot is alive 💉", { status: 200 });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // ✅ Step 1: Verify Discord's signature (the part n8n can't do)
    const signature = request.headers.get("x-signature-ed25519");
    const timestamp = request.headers.get("x-signature-timestamp");
    const body = await request.text();

    const isValid = await verifyKey(body, signature, timestamp, DISCORD_PUBLIC_KEY);
    if (!isValid) {
      return new Response("Bad request signature", { status: 401 });
    }

    const interaction = JSON.parse(body);

    // ✅ Step 2: Handle Discord's ping (required for verification)
    if (interaction.type === 1) {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ✅ Step 3: Handle /meal slash command
    if (interaction.type === 2 && interaction.data.name === "meal") {
      const mealText = interaction.data.options?.[0]?.value || "";
      const userId = interaction.member?.user?.id || interaction.user?.id;
      const username = interaction.member?.user?.username || interaction.user?.username;

      // Fire and forget — send to n8n in the background
      const webhookPayload = {
        meal_text: mealText,
        user_id: userId,
        username: username,
        channel_id: interaction.channel_id,
        interaction_token: interaction.token, // n8n needs this to reply later
        application_id: interaction.application_id,
      };

      // Call n8n webhook (non-blocking)
      fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      }).catch(console.error);

      // ✅ Step 4: Immediately acknowledge to Discord (required within 3 seconds)
      return new Response(
        JSON.stringify({
          type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE — shows "thinking..."
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response("Unknown interaction", { status: 400 });
  },
};
