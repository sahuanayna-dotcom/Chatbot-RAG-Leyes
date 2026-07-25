const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/embeddings";

import dotenv from "dotenv";

dotenv.config({
  path: ".env.local",
});

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY no está configurada. " +
        "Crea un archivo .env.local con tu API key de OpenRouter."
    );
  }
  return key;
}

export async function generateEmbedding(
  text: string
): Promise<number[]> {
  const apiKey = getApiKey();

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Error al generar embedding: ${response.status} - ${error}`
    );
  }

  const data = await response.json();
  return data.data[0].embedding;
}

export async function generateEmbeddings(
  texts: string[],
  batchSize: number = 100
): Promise<number[][]> {
  const embeddings: number[][] = [];
  const apiKey = getApiKey();

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/text-embedding-3-small",
        input: batch,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Error al generar embeddings: ${response.status} - ${error}`
      );
    }

    const data = await response.json();
    const batchEmbeddings = data.data
      .sort(
        (a: { index: number }, b: { index: number }) =>
          a.index - b.index
      )
      .map((item: { embedding: number[] }) => item.embedding);

    embeddings.push(...batchEmbeddings);

    const progress = Math.min(i + batchSize, texts.length);
    console.log(
      `  Embeddings generados: ${progress}/${texts.length}`
    );
  }

  return embeddings;
}
