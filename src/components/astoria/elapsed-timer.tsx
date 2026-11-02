"use client";

import { useEffect, useState } from "react";

export function ElapsedTimer({
  prefix = "Mentor sedang menulis",
  className = "",
}: {
  prefix?: string;
  className?: string;
}) {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

  const seconds = Math.max(0, (now - start) / 1000);
  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}… {seconds.toFixed(1).replace(".", ",")} dtk
    </span>
  );
}
