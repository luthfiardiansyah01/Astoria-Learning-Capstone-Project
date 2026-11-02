"use client";

import { useEffect, useState } from "react";

const formatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function RealtimeClock({ className = "" }: { className?: string }) {
  const [time, setTime] = useState("--.--.--");

  useEffect(() => {
    const tick = () => setTime(formatter.format(new Date()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span suppressHydrationWarning className={`tabular-nums ${className}`}>
      {time} WIB
    </span>
  );
}
