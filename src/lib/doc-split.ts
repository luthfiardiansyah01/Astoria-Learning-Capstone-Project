export interface DocPart {
  title: string;
  content: string;
  chars: number;
}

const HEADING = /^(bab|bagian|chapter|unit|modul|pertemuan)\b/i;
const NUMBERED = /^\d+(\.\d+)*[.)]?\s+\S/;

function headingTitle(line: string) {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 120) return null;
  if (HEADING.test(trimmed)) return trimmed;
  if (NUMBERED.test(trimmed)) return trimmed;
  return null;
}

function hardSplit(text: string, maxChars: number) {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(text.length, start + maxChars);
    if (end < text.length) {
      const slice = text.slice(start, end);
      const breakAt = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf(". "));
      if (breakAt > maxChars * 0.5) end = start + breakAt + 1;
    }
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  return chunks.filter(Boolean);
}

function splitSection(section: string, maxChars: number) {
  if (section.length <= maxChars) return [section];
  const paragraphs = section.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      if (current) {
        chunks.push(current.trim());
        current = "";
      }
      chunks.push(...hardSplit(paragraph, maxChars));
      continue;
    }
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxChars) {
      if (current) chunks.push(current.trim());
      current = paragraph;
    } else {
      current = candidate;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

/**
 * Pecah teks menjadi beberapa bagian yang tidak melebihi maxChars.
 * Mengutamakan batas bab/bagian, lalu paragraf, lalu potongan keras.
 */
export function splitDocument(text: string, maxChars: number): DocPart[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) return [];
  if (normalized.length <= maxChars) {
    return [{ title: "Dokumen", content: normalized, chars: normalized.length }];
  }

  const lines = normalized.split("\n");
  const sections: { title: string; content: string }[] = [];
  let buffer: string[] = [];
  let title = "";

  const flush = () => {
    const content = buffer.join("\n").trim();
    if (content) {
      sections.push({ title: title || `Bagian ${sections.length + 1}`, content });
    }
    buffer = [];
  };

  for (const line of lines) {
    const detected = headingTitle(line);
    if (detected && buffer.join("\n").trim()) {
      flush();
      title = detected;
      buffer = [line];
    } else {
      buffer.push(line);
    }
  }
  flush();

  if (sections.length === 0) {
    sections.push({ title: "Dokumen", content: normalized });
  }

  const parts: DocPart[] = [];
  let current = "";
  let currentTitle = "";

  const pushCurrent = () => {
    const content = current.trim();
    if (content) {
      parts.push({
        title: currentTitle || `Bagian ${parts.length + 1}`,
        content,
        chars: content.length,
      });
    }
    current = "";
    currentTitle = "";
  };

  for (const section of sections) {
    const chunks = splitSection(section.content, maxChars);
    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      const label = index === 0 ? section.title : `${section.title} (lanjutan)`;
      const candidate = current ? `${current}\n\n${chunk}` : chunk;
      if (candidate.length > maxChars) {
        pushCurrent();
        current = chunk;
        currentTitle = label;
      } else {
        if (!current) currentTitle = label;
        current = candidate;
      }
    }
  }
  pushCurrent();

  return parts.map((part, index) => ({
    ...part,
    title: part.title || `Bagian ${index + 1}`,
  }));
}
