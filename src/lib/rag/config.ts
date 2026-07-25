import path from "path";

const PROJECT_ROOT = path.resolve(process.cwd());

export const RAG_CONFIG = {
  paths: {
    textsDir: path.join(PROJECT_ROOT, "processed", "textos_extraidos"),
    indexCsv: path.join(PROJECT_ROOT, "processed", "_indice.csv"),
    dataDir: path.join(PROJECT_ROOT, "data"),
    vectorsDir: path.join(PROJECT_ROOT, "data", "vectors"),
  },
  chunking: {
    maxChunkSize: 800,
    overlap: 150,
  },
  embedding: {
    model: "Xenova/all-MiniLM-L6-v2",
    dimension: 384,
  },
} as const;
