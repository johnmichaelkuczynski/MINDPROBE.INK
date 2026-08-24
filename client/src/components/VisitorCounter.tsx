import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

export function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/visitor-count", { credentials: "include" })
      .then((response) => {
        if (!response.ok) throw new Error("Visitor count unavailable");
        return response.json() as Promise<{ count: number }>;
      })
      .then((data) => {
        if (active) setCount(data.count);
      })
      .catch(() => {
        if (active) setCount(null);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      className="flex items-center gap-1.5 text-xs text-gray-500"
      aria-label={count == null ? "Visitor count loading" : `${count.toLocaleString()} visitors`}
      title="Total visits to Mind Probe"
      data-testid="visitor-counter"
    >
      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{count == null ? "—" : count.toLocaleString()} visitors</span>
    </div>
  );
}