import { verifyKey } from "discord-interactions";

// Variables are removed from the top and moved inside the fetch function via 'env'

export default {
  // Added 'env' and 'ctx' parameters here
  async fetch(request, env, ctx) {
    if (request.method === "GET") {
      return new Response("Insulin Buddy bot is alive 💉", { status: 200 });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // ✅ Step 1: Verify Discord's signature
    const signature = request.headers.get("x-signature-ed25519");
    const timestamp = request.headers.get("x-signature-timestamp");
    const body = await request.text();

    // Use env.DISCORD_PUBLIC_KEY
    const isValid = await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
    if (!isValid) {
      return new Response("Bad request signature", { status: 401 });
    }

    const interaction = JSON.parse(body);

    // ✅ Step 2: Handle Discord's ping
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

      const webhookPayload = {
        meal_text: mealText,
        user_id: userId,
        username: username,
        channel_id: interaction.channel_id,
        interaction_token: interaction.token,
        application_id: interaction.application_id,
      };

      // ✅ Step 3.5: Call n8n AND save the promise
      // Use env.N8N_WEBHOOK_URL
      const n8nPromise = fetch(env.N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      }).catch(console.error);

      // Tell Cloudflare NOT to kill the worker until n8n safely receives the data!
      ctx.waitUntil(n8nPromise);

      // ✅ Step 4: Immediately acknowledge to Discord
      return new Response(
        JSON.stringify({
          type: 5, // Shows "thinking..."
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response("Unknown interaction", { status: 400 });
  },
};
