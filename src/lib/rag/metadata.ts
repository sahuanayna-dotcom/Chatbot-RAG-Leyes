import fs from "fs";
import { RAG_CONFIG } from "./config";

export interface BillMetadata {
  numero: string;
  proyecto: string;
  fecha: string;
  estado: string;
  titulo: string;
  autores: string;
}

export function loadBillMetadata(): Map<string, BillMetadata> {
  const csvPath = RAG_CONFIG.paths.indexCsv;
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());

  const metadata = new Map<string, BillMetadata>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const fields = parseCsvLine(line);
    const numero = fields[0]?.trim();

    if (numero) {
      metadata.set(numero, {
        numero,
        proyecto: fields[1]?.trim() || "",
        fecha: fields[2]?.trim() || "",
        estado: fields[3]?.trim() || "",
        titulo: fields[4]?.trim() || "",
        autores: fields[5]?.trim() || "",
      });
    }
  }

  return metadata;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }

  fields.push(current);
  return fields;
}

export function extractBillNumber(
  filename: string
): string | null {
  const match = filename.match(/PL_(\d+)/);
  return match ? match[1] : null;
}
