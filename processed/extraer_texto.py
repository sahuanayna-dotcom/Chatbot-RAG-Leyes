import os
import csv
import pdfplumber

CARPETA_PDF = os.path.dirname(os.path.abspath(__file__))
CARPETA_SALIDA = os.path.join(CARPETA_PDF, "textos_extraidos")

os.makedirs(CARPETA_SALIDA, exist_ok=True)

archivos_pdf = sorted([f for f in os.listdir(CARPETA_PDF) if f.lower().endswith(".pdf")])

print(f"Encontrados {len(archivos_pdf)} archivos PDF")

resumen = []

for i, archivo in enumerate(archivos_pdf, 1):
    ruta_pdf = os.path.join(CARPETA_PDF, archivo)
    nombre_salida = archivo.replace(".pdf", ".txt")
    ruta_salida = os.path.join(CARPETA_SALIDA, nombre_salida)

    try:
        with pdfplumber.open(ruta_pdf) as pdf:
            texto_completo = ""
            num_paginas = len(pdf.pages)
            for pagina in pdf.pages:
                texto_pagina = pagina.extract_text()
                if texto_pagina:
                    texto_completo += texto_pagina + "\n\n"

        with open(ruta_salida, "w", encoding="utf-8") as f:
            f.write(texto_completo.strip())

        caracteres = len(texto_completo)
        resumen.append((archivo, num_paginas, caracteres, "OK"))
        print(f"[{i}/{len(archivos_pdf)}] {archivo} -> {num_paginas} paginas, {caracteres} caracteres")

    except Exception as e:
        resumen.append((archivo, 0, 0, str(e)))
        print(f"[{i}/{len(archivos_pdf)}] ERROR en {archivo}: {e}")

csv_resumen = os.path.join(CARPETA_SALIDA, "_resumen_extraccion.csv")
with open(csv_resumen, "w", encoding="utf-8", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["archivo", "paginas", "caracteres", "estado"])
    writer.writerows(resumen)

print(f"\nListo. Textos guardados en: {CARPETA_SALIDA}")
print(f"Resumen guardado en: {csv_resumen}")
