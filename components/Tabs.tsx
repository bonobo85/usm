"use client";
import { ReactNode, useState } from "react";

export function Tabs({
  tabs, defaultIndex = 0
}: {
  tabs: { label: string; icon?: ReactNode; content: ReactNode }[];
  defaultIndex?: number;
}) {
  const [i, setI] = useState(defaultIndex);
  return (
    <div>
      <div className="flex gap-1 border-b border-[var(--bordure)] mb-4 overflow-x-auto">
        {tabs.map((t, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition ${
              i === idx
                ? "border-[var(--or)] text-[var(--or)]"
                : "border-transparent text-[var(--texte-muted)] hover:text-white"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
      <div>{tabs[i].content}</div>
    </div>
  );
}
