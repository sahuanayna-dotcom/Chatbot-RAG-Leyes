import fs from "fs";
import path from "path";
import { RAG_CONFIG } from "./config";

export interface VectorRecord {
  id: string;
  text: string;
  embedding: number[];
  metadata: {
    proyecto: string;
    titulo: string;
    archivo: string;
    chunkIndex: number;
  };
}

interface VectorStoreData {
  records: VectorRecord[];
  createdAt: string;
  updatedAt: string;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class VectorStore {
  private data: VectorStoreData;
  private filePath: string;

  constructor() {
    this.filePath = path.join(
      RAG_CONFIG.paths.vectorsDir,
      "index.json"
    );
    this.data = this.load();
  }

  private load(): VectorStoreData {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        return JSON.parse(raw);
      }
    } catch (error) {
      console.warn("Error al cargar índice vectorial:", error);
    }

    return {
      records: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private save(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.data.updatedAt = new Date().toISOString();
    fs.writeFileSync(
      this.filePath,
      JSON.stringify(this.data, null, 2),
      "utf-8"
    );
  }

  add(record: Omit<VectorRecord, "id">): string {
    const id = `chunk_${this.data.records.length}`;
    this.data.records.push({ ...record, id });
    return id;
  }

  saveToDisk(): void {
    this.save();
    console.log(
      `Índice vectorial guardado: ${this.data.records.length} registros`
    );
  }

  findByProjectNumber(
  projectNumber: string
): Array<VectorRecord & { score: number }> {
  return this.data.records
    .filter((record) =>
      record.metadata.proyecto.includes(projectNumber)
    )
    .map((record) => ({
      ...record,
      score: 1,
    }));
}

  async search(
    queryEmbedding: number[],
    topK: number = 5
  ): Promise<
    Array<VectorRecord & { score: number }>
  > {
    const results = this.data.records.map((record) => {
  let score = cosineSimilarity(
    queryEmbedding,
    record.embedding
  );

  const title = record.metadata.titulo.toLowerCase();

  if (
    title.includes("inteligencia artificial") ||
    title.includes("inteligencia")
  ) {
    score += 0.15;
  }

  return {
    ...record,
    score,
  };
});

    results.sort((a, b) => b.score - a.score);

const MIN_SCORE = 0.45;

return results
  .filter((r) => r.score >= MIN_SCORE)
  .slice(0, topK);
  }

  size(): number {
    return this.data.records.length;
  }

  clear(): void {
    this.data = {
      records: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
