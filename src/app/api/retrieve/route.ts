import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding, VectorStore } from "@/lib/rag";

const store = new VectorStore();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "El campo 'query' es requerido y debe ser un string." },
        { status: 400 }
      );
    }

    if (store.size() === 0) {
      return NextResponse.json(
        { error: "El índice vectorial está vacío. Ejecuta 'npm run index' primero." },
        { status: 400 }
      );
    }

    const queryEmbedding = await generateEmbedding(query);

    const results = await store.search(queryEmbedding, 5);

    const response = results.map((r) => ({
      text: r.text,
      score: Math.round(r.score * 10000) / 10000,
      metadata: {
        proyecto: r.metadata.proyecto,
        titulo: r.metadata.titulo,
        archivo: r.metadata.archivo,
        chunkIndex: r.metadata.chunkIndex,
      },
    }));

    return NextResponse.json({
      query,
      totalChunks: store.size(),
      results: response,
    });
  } catch (error) {
    console.error("Error en /api/retrieve:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}
