import "dotenv/config";
import fs from "fs";
import path from "path";
import {
  RAG_CONFIG,
  chunkText,
  generateEmbeddings,
  VectorStore,
  loadBillMetadata,
  extractBillNumber,
} from "../src/lib/rag";

const TEXTS_DIR = RAG_CONFIG.paths.textsDir;

async function main() {
  console.log("=== Pipeline RAG (modo memoria baja) ===");

  const metadata = loadBillMetadata();

  const txtFiles = fs
    .readdirSync(TEXTS_DIR)
    .filter((f) => f.endsWith(".txt") && !f.startsWith("_"))
    .sort();

  console.log(`Documentos encontrados: ${txtFiles.length}`);

  const store = new VectorStore();
  store.clear();

  let totalChunks = 0;

  for (const [index, fileName] of txtFiles.entries()) {
    console.log(
      `\nProcesando ${index + 1}/${txtFiles.length}: ${fileName}`
    );

    const filePath = path.join(TEXTS_DIR, fileName);

    const content = fs
      .readFileSync(filePath, "utf-8")
      .trim();

    if (!content) {
      console.log("Archivo vacío, se omite");
      continue;
    }

    const chunks = chunkText(
      content,
      RAG_CONFIG.chunking.maxChunkSize,
      RAG_CONFIG.chunking.overlap
    );

    console.log(`Chunks creados: ${chunks.length}`);

    const texts = chunks.map((c) => c.text);

    const embeddings = await generateEmbeddings(texts);

    const billNumber = extractBillNumber(fileName);

    const billMeta = billNumber
      ? metadata.get(billNumber)
      : null;

    for (let i = 0; i < chunks.length; i++) {
      store.add({
        text: chunks[i].text,
        embedding: embeddings[i],
        metadata: {
          proyecto:
            billMeta?.proyecto ||
            billNumber ||
            "",
          titulo:
            billMeta?.titulo ||
            "",
          archivo: fileName,
          chunkIndex: chunks[i].chunkIndex,
        },
      });
    }

    totalChunks += chunks.length;

    // Guardar cada documento
    store.saveToDisk();

    console.log(
      `Guardado. Chunks acumulados: ${totalChunks}`
    );

    // liberar memoria
    await new Promise((resolve) =>
      setTimeout(resolve, 100)
    );
  }

  console.log("\n====================");
  console.log("INDEXACIÓN TERMINADA");
  console.log(`Total chunks: ${totalChunks}`);
  console.log("====================");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});