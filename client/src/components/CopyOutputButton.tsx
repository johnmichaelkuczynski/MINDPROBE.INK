import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { copyTextToClipboard } from "@/lib/clipboard";

interface CopyOutputButtonProps {
  text: string;
  compact?: boolean;
  label?: string;
  testId?: string;
  className?: string;
  variant?: "ghost" | "secondary";
}

export function CopyOutputButton({
  text, compact = false, label = "Copy", testId = "button-copy-output",
  className, variant = "ghost",
}: CopyOutputButtonProps) {
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();
  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current); }, []);

  return (
    <Button
      type="button"
      size={compact ? "icon" : "sm"}
      variant={variant}
      disabled={!text.trim() || copying}
      className={className}
      data-testid={testId}
      title="Copy all output received so far"
      aria-label={copied ? "Output copied" : "Copy output"}
      onClick={async () => {
        setCopying(true);
        try {
          await copyTextToClipboard(text);
          setCopied(true);
          toast({ title: "Output copied", description: "The output received so far is on your clipboard." });
          if (timeout.current) clearTimeout(timeout.current);
          timeout.current = setTimeout(() => setCopied(false), 2000);
        } catch {
          toast({ title: "Copy failed", description: "Your browser blocked clipboard access. You can select and copy the output manually.", variant: "destructive" });
        } finally {
          setCopying(false);
        }
      }}
    >
      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      {!compact && <span className="ml-2" aria-live="polite">{copied ? "Copied" : label}</span>}
    </Button>
  );
}
