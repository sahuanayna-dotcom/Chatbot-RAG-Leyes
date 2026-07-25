export interface Chunk {
  text: string;
  chunkIndex: number;
}

export function chunkText(
  text: string,
  maxChunkSize: number,
  overlap: number
): Chunk[] {
  if (!text) return [];

  const cleanText = text
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanText) return [];

  const chunks: Chunk[] = [];

  let start = 0;
  let index = 0;

  while (start < cleanText.length) {
    const end = Math.min(
      start + maxChunkSize,
      cleanText.length
    );

    const piece = cleanText
      .slice(start, end)
      .trim();

    if (piece.length > 0) {
      chunks.push({
        text: piece,
        chunkIndex: index,
      });

      index++;
    }

    if (end === cleanText.length) {
      break;
    }

    start = end - overlap;

    // protección contra ciclos infinitos
    if (start <= 0 || start >= cleanText.length) {
      start = end;
    }
  }

  return chunks;
}