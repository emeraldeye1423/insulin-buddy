export default {
  async fetch(request, env) {
    const DISCORD_PUBLIC_KEY = env.DISCORD_PUBLIC_KEY;
    const N8N_WEBHOOK_URL = env.N8N_WEBHOOK_URL;

    if (request.method === "GET") {
      return new Response("Insulin Buddy bot is alive 💉", { status: 200 });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const signature = request.headers.get("x-signature-ed25519");
    const timestamp = request.headers.get("x-signature-timestamp");
    const body = await request.text();

    const isValid = await verifyDiscordSignature(DISCORD_PUBLIC_KEY, signature, timestamp, body);
    if (!isValid) {
      return new Response("Bad request signature", { status: 401 });
    }

    const interaction = JSON.parse(body);

    if (interaction.type === 1) {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (interaction.type === 2 && interaction.data.name === "meal") {
      const mealText = interaction.data.options?.[0]?.value || "";
      const userId = interaction.member?.user?.id || interaction.user?.id;
      const username = interaction.member?.user?.username || interaction.user?.username;

      const webhookPayload = {
        meal_text: mealText,
        user_id: userId,
        username: username,
        channel_id: interaction.channel_id,
        interaction_token: interaction.token,
        application_id: interaction.application_id,
      };

      fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      }).catch(console.error);

      return new Response(
        JSON.stringify({ type: 5 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response("Unknown interaction", { status: 400 });
  },
};

async function verifyDiscordSignature(publicKey, signature, timestamp, body) {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      hexToUint8Array(publicKey),
      { name: "Ed25519" },
      false,
      ["verify"]
    );
    return await crypto.subtle.verify(
      "Ed25519",
      key,
      hexToUint8Array(signature),
      new TextEncoder().encode(timestamp + body)
    );
  } catch (e) {
    console.error("Verification error:", e);
    return false;
  }
}

function hexToUint8Array(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
