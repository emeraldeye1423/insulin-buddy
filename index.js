export default {
  async fetch(request, env) {
    const N8N_WEBHOOK_URL = env.N8N_WEBHOOK_URL;

    if (request.method === "GET") {
      return new Response("Insulin Buddy bot is alive 💉", { status: 200 });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await request.text();
    const interaction = JSON.parse(body);

    // Handle Discord's ping verification
    if (interaction.type === 1) {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle /meal slash command
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

      // Send to n8n in background using waitUntil
      const fetchPromise = fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      });

      // Return immediately to Discord
      return new Response(
        JSON.stringify({ type: 5 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response("Unknown interaction", { status: 400 });
  },
};
