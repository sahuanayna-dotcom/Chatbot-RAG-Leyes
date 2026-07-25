import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding, VectorStore } from "@/lib/rag";

const store = new VectorStore();

function buildPrompt(
  query: string,
  results: Array<{
    text: string;
    metadata: {
      proyecto: string;
      titulo: string;
      archivo: string;
    };
  }>
): string {
  const contextBlocks = results
    .map(
      (r, i) =>
        `[Fragmento ${i + 1}]\n` +
        `Proyecto: ${r.metadata.proyecto}\n` +
        `Título: ${r.metadata.titulo}\n` +
        `Contenido: ${r.text}`
    )
    .join("\n\n");

  return [
    "Eres un asistente especializado en proyectos de ley del Congreso del Perú.",
    "Tu tarea es responder preguntas basándote EXCLUSIVAMENTE en la información contenida en los siguientes fragmentos de proyectos de ley.",
    "",
    "Reglas estrictas (debes cumplirlas SIEMPRE):",
    "- Responde ÚNICAMENTE usando la información de los fragmentos proporcionados.",
    "- Si la pregunta pide listar proyectos sobre un tema específico, revisa TODOS los fragmentos antes de responder.",
    "- Diferencia entre un proyecto que tiene como TEMA PRINCIPAL un concepto y un proyecto que solamente menciona ese concepto dentro de un artículo.",
    "- Para preguntas como '¿Qué proyectos hablan sobre inteligencia artificial?', prioriza proyectos cuyo título o finalidad estén relacionados directamente con inteligencia artificial.",
    "- No incluyas un proyecto solamente porque contiene una mención secundaria al término consultado.",
    "- Clasifica como 'tema principal' solamente los proyectos cuyo título o finalidad central estén directamente relacionados con la consulta.",
    "- Si un proyecto pertenece a otro tema principal pero menciona el concepto consultado dentro de sus artículos, clasifícalo como 'mención relacionada', no como tema principal.",
    "- No conviertas menciones dentro de artículos en el tema principal del proyecto.",
    "- Si un proyecto solo menciona inteligencia artificial como una herramienta dentro de educación, NO lo clasifiques como proyecto de inteligencia artificial.",
    "- Si existen proyectos cuyo título menciona explícitamente inteligencia artificial, dales prioridad.",
    "- No selecciones proyectos solamente porque el tema sea parecido; verifica que el texto del fragmento contenga realmente la palabra o concepto consultado.",
    "- Si un fragmento contiene explícitamente 'inteligencia artificial', 'IA' o 'uso ilícito de inteligencia artificial', ese proyecto tiene prioridad para preguntas sobre inteligencia artificial.",
    "- NUNCA inventes, supongas o menciones proyectos de ley que no aparezcan EXPLÍCITAMENTE en los fragmentos.",
    "- Si los fragmentos no contienen información suficiente para responder, responde exactamente: \"No encontré información sobre esa consulta en los proyectos de ley disponibles.\"",
    "- Al mencionar un proyecto de ley, usa SOLO el número de proyecto que aparece en el campo \"Proyecto\" del fragmento.",
    "- Siempre responde en español.",
    "- Sé preciso y conciso.",
    "- Al final de tu respuesta, incluye una sección \"Fuentes:\" listando EXCLUSIVAMENTE los números de proyecto de ley que aparecen en los fragmentos y que utilizaste para tu respuesta (sin repetir, sin inventar).",
    "",
    "Fragmentos de proyectos de ley:",
    "",
    contextBlocks,
    "",
    "Pregunta del usuario: " + query,
  ].join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, apiKey } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "El campo 'query' es requerido." },
        { status: 400 }
      );
    }

    const openrouterKey =
      apiKey || process.env.OPENROUTER_API_KEY;

    if (!openrouterKey) {
      return NextResponse.json(
        {
          error:
            "API key de OpenRouter no configurada. Ingresa tu API key en el panel lateral.",
        },
        { status: 400 }
      );
    }

    if (store.size() === 0) {
      return NextResponse.json(
        {
          error:
            "El índice vectorial está vacío. Ejecuta 'npm run index' primero.",
        },
        { status: 400 }
      );
    }

    const projectMatch = query.match(/\d{5}/);

let results;

if (projectMatch) {
  console.log("Búsqueda por número:", projectMatch[0]);

  results = store.findByProjectNumber(projectMatch[0]);

  if (results.length === 0) {
    const queryEmbedding = await generateEmbedding(query);
    results = await store.search(queryEmbedding, 50);
  } else {
    results = results.slice(0, 5);
  }
} else {
  const queryEmbedding = await generateEmbedding(query);
  results = await store.search(queryEmbedding, 5);
}

    console.log("RESULTADOS RECUPERADOS:");
results.forEach((r) => {
  console.log(
    "Proyecto:",
    r.metadata.proyecto,
    "| Título:",
    r.metadata.titulo,
    "| Score:",
    r.score
  );
}); 

    const prompt = buildPrompt(query, results);

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openrouterKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 2048,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        {
          error: `Error del modelo: ${response.status} - ${error}`,
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "";

    const sources = [
      ...new Set(results.map((r) => r.metadata.proyecto)),
    ];

    return NextResponse.json({
      answer,
      sources,
      retrievedChunks: results.map((r) => ({
        text: r.text.substring(0, 200) + "...",
        score: Math.round(r.score * 10000) / 10000,
        metadata: r.metadata,
      })),
    });
  } catch (error) {
    console.error("Error en /api/chat:", error);
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
