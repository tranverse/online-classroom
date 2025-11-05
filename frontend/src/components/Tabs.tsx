import React, { useState } from "react";

export const Tabs: React.FC<{
  tabs: { key: string; label: string; content: React.ReactNode }[];
}> = ({ tabs }) => {
  const [active, setActive] = useState(tabs[0]?.key || "");
  return (
    <div>
      <div className="flex gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-1 rounded ${
              active === t.key ? "bg-blue-600 text-white" : "bg-gray-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{tabs.find((t) => t.key === active)?.content}</div>
    </div>
  );
};

export default Tabs;
