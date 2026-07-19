import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DictateButtonProps {
  state: "idle" | "connecting" | "recording" | "error";
  onStart: () => void;
  onStop: () => void;
  size?: "sm" | "default";
}

export function DictateButton({ state, onStart, onStop, size = "sm" }: DictateButtonProps) {
  const handleClick = () => {
    if (state === "recording") {
      onStop();
    } else if (state === "idle") {
      onStart();
    }
  };

  if (state === "connecting") {
    return (
      <Button
        variant="ghost"
        size={size}
        disabled
        className="text-gray-400"
        title="Connecting to voice service..."
        data-testid="button-dictate-connecting"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (state === "recording") {
    return (
      <Button
        variant="ghost"
        size={size}
        onClick={handleClick}
        className="text-red-500 hover:text-red-600 hover:bg-red-50 animate-pulse"
        title="Recording — click to stop"
        data-testid="button-dictate-stop"
      >
        <MicOff className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleClick}
      className="text-gray-500 hover:text-primary-blue hover:bg-blue-50"
      title="Click to dictate"
      data-testid="button-dictate-start"
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
}
