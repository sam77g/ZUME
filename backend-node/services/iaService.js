const GROQ_URL       = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_TIMEOUT_MS = 20000;

async function chamarGroq(payload) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY não configurada no .env");
  }

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body:   JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw new Error("GROQ_TIMEOUT");
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await res.json();
  return { status: res.status, data };
}

module.exports = { chamarGroq };
