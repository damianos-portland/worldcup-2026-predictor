"use client";

import { useEffect, useState } from "react";

function diff(target: number) {
  const now = Date.now();
  const delta = Math.max(0, target - now);
  return {
    days: Math.floor(delta / 86400000),
    hours: Math.floor((delta % 86400000) / 3600000),
    minutes: Math.floor((delta % 3600000) / 60000),
    seconds: Math.floor((delta % 60000) / 1000),
    done: delta === 0,
  };
}

export function Countdown({ target }: { target: string }) {
  const t = new Date(target).getTime();
  const [time, setTime] = useState(() => diff(t));

  useEffect(() => {
    const id = setInterval(() => setTime(diff(t)), 1000);
    return () => clearInterval(id);
  }, [t]);

  const units = [
    { label: "Days", value: time.days },
    { label: "Hrs", value: time.hours },
    { label: "Min", value: time.minutes },
    { label: "Sec", value: time.seconds },
  ];

  return (
    <div className="flex gap-2 sm:gap-3">
      {units.map((u) => (
        <div
          key={u.label}
          className="glass-strong flex min-w-[58px] flex-col items-center rounded-xl px-3 py-2"
        >
          <span className="gold-text font-display text-2xl font-bold tabular-nums sm:text-3xl">
            {String(u.value).padStart(2, "0")}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {u.label}
          </span>
        </div>
      ))}
    </div>
  );
}
