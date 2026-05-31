const tagColorMap: Record<string, string> = {
  "bg-red-500": "#ef4444",
  "bg-orange-500": "#f97316",
  "bg-amber-500": "#f59e0b",
  "bg-green-500": "#22c55e",
  "bg-emerald-500": "#10b981",
  "bg-teal-500": "#14b8a6",
  "bg-cyan-500": "#06b6d4",
  "bg-blue-500": "#3b82f6",
  "bg-indigo-500": "#6366f1",
  "bg-violet-500": "#8b5cf6",
  "bg-purple-500": "#a855f7",
  "bg-fuchsia-500": "#d946ef",
  "bg-pink-500": "#ec4899",
  "bg-rose-500": "#f43f5e",
};

export function tagColorStyle(color: string) {
  return {
    backgroundColor: tagColorMap[color] ?? "#536b4f",
  };
}
