// Renderer markdown ringan untuk respons Mentor AI (format spesifikasi:
// **Penjelasan**, **Poin Kunci**, **📄 Referensi**, **💡 Eksplorasi Lebih Lanjut**)
"use client";

import ReactMarkdown from "react-markdown";

export function Markdown({ content }: { content: string }) {
  return (
    <div className="astoria-md prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-li:my-0.5 prose-ul:my-2 prose-strong:text-primary">
      <ReactMarkdown
        components={{
          strong: ({ children }) => (
            <strong className="font-semibold text-primary">{children}</strong>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>
          ),
          p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
