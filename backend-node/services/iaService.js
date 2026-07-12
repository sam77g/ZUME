const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

async function chamarGroq(payload) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY não configurada no .env");
  }

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  return { status: res.status, data };
}

module.exports = { chamarGroq };
