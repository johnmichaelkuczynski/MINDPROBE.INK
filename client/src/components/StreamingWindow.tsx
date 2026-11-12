import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { useWordReveal } from "@/hooks/useWordReveal";
import { Check, ChevronDown, ChevronUp, CircleAlert, Grip, LoaderCircle, X } from "lucide-react";
import { CopyOutputButton } from "./CopyOutputButton";

export interface StreamingWindowChannel {
  id: string;
  label: string;
  status: "connecting" | "streaming" | "complete" | "error";
  message: string;
  text: string;
  sectionComplete?: boolean;
}

interface StreamingWindowProps {
  open: boolean;
  onClose: () => void;
  streams: StreamingWindowChannel[];
}

interface WindowFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DragOrigin {
  pointerId: number;
  pointerX: number;
  pointerY: number;
  x: number;
  y: number;
}

interface ResizeOrigin {
  pointerId: number;
  pointerX: number;
  pointerY: number;
  frame: WindowFrame;
}

const DEFAULT_WIDTH = 460;
const DEFAULT_HEIGHT = 540;
const HEADER_HEIGHT = 58;
const EDGE_GUTTER = 8;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 300;

function limits() {
  return {
    width: Math.max(1, window.innerWidth - EDGE_GUTTER * 2),
    height: Math.max(1, window.innerHeight - EDGE_GUTTER * 2),
  };
}

function fitFrame(frame: WindowFrame, collapsed: boolean): WindowFrame {
  const viewport = limits();
  const width = Math.min(Math.max(frame.width, Math.min(MIN_WIDTH, viewport.width)), viewport.width);
  const minHeight = Math.min(MIN_HEIGHT, viewport.height);
  const height = Math.min(Math.max(frame.height, minHeight), viewport.height);
  const visibleHeight = collapsed ? HEADER_HEIGHT : height;
  return {
    x: Math.max(EDGE_GUTTER, Math.min(frame.x, window.innerWidth - width - EDGE_GUTTER)),
    y: Math.max(EDGE_GUTTER, Math.min(frame.y, window.innerHeight - visibleHeight - EDGE_GUTTER)),
    width,
    height,
  };
}

function statusLabel(status: StreamingWindowChannel["status"]) {
  switch (status) {
    case "connecting":
      return "Connecting";
    case "streaming":
      return "Live";
    case "complete":
      return "Complete";
    case "error":
      return "Interrupted";
  }
}

function statusColor(status: StreamingWindowChannel["status"]) {
  switch (status) {
    case "connecting":
      return "#718198";
    case "streaming":
      return "#1874d1";
    case "complete":
      return "#27805c";
    case "error":
      return "#b65353";
  }
}

export function StreamingWindow({ open, onClose, streams }: StreamingWindowProps) {
  const [selectedId, setSelectedId] = useState<string | null>(streams[0]?.id ?? null);
  const [collapsed, setCollapsed] = useState(false);
  const [frame, setFrame] = useState<WindowFrame>({ x: 16, y: 16, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [positioned, setPositioned] = useState(false);
  const [nearBottom, setNearBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragOrigin | null>(null);
  const resizeRef = useRef<ResizeOrigin | null>(null);
  const nearBottomRef = useRef(true);
  const newestChannelRef = useRef<string | null>(null);
  const selectedChannel = streams.find((stream) => stream.id === selectedId) ?? streams[0] ?? null;
  const { displayedText, isCatchingUp } = useWordReveal(
    selectedChannel?.text ?? "",
    selectedChannel?.status === "complete" || selectedChannel?.status === "error" || Boolean(selectedChannel?.sectionComplete),
    selectedChannel?.id ?? "",
  );

  useEffect(() => {
    if (!streams.length) {
      setSelectedId(null);
      return;
    }
    const newest = streams[streams.length - 1].id;
    if (newest !== newestChannelRef.current) {
      newestChannelRef.current = newest;
      setSelectedId(newest);
    } else if (!selectedId || !streams.some((stream) => stream.id === selectedId)) {
      setSelectedId(newest);
    }
  }, [streams, selectedId]);

  useEffect(() => {
    if (!positioned && typeof window !== "undefined") {
      const viewport = limits();
      const width = Math.min(DEFAULT_WIDTH, viewport.width);
      const height = Math.min(DEFAULT_HEIGHT, viewport.height);
      setFrame({
        x: Math.max(EDGE_GUTTER, window.innerWidth - width - 24),
        y: Math.max(EDGE_GUTTER, window.innerHeight - height - 24),
        width,
        height,
      });
      setPositioned(true);
    }
  }, [positioned]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onViewportResize = () => setFrame((current) => fitFrame(current, collapsed));
    window.addEventListener("resize", onViewportResize);
    return () => window.removeEventListener("resize", onViewportResize);
  }, [collapsed]);

  useEffect(() => {
    nearBottomRef.current = true;
    setNearBottom(true);
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [selectedChannel?.id]);

  useEffect(() => {
    if (nearBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedText, collapsed, open]);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    const isNear = element.scrollHeight - element.scrollTop - element.clientHeight < 56;
    nearBottomRef.current = isNear;
    setNearBottom(isNear);
  };

  const startDrag = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: frame.x,
      y: frame.y,
    };
  };

  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setFrame((current) =>
      fitFrame(
        {
          ...current,
          x: drag.x + event.clientX - drag.pointerX,
          y: drag.y + event.clientY - drag.pointerY,
        },
        collapsed,
      ),
    );
  };

  const finishDrag = (event: PointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const startResize = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      frame: { ...frame },
    };
  };

  const resizeTo = (width: number, height: number, origin = frame) => {
    const viewport = limits();
    const minWidth = Math.min(MIN_WIDTH, viewport.width);
    const minHeight = Math.min(MIN_HEIGHT, viewport.height);
    const nextWidth = Math.max(minWidth, Math.min(width, viewport.width));
    const nextHeight = Math.max(minHeight, Math.min(height, viewport.height));
    setFrame(
      fitFrame(
        {
          x: origin.x,
          y: origin.y,
          width: nextWidth,
          height: nextHeight,
        },
        false,
      ),
    );
  };

  const moveResize = (event: PointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    resizeTo(
      resize.frame.width + event.clientX - resize.pointerX,
      resize.frame.height + event.clientY - resize.pointerY,
      resize.frame,
    );
  };

  const finishResize = (event: PointerEvent<HTMLButtonElement>) => {
    if (resizeRef.current?.pointerId === event.pointerId) resizeRef.current = null;
  };

  const handleResizeKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const increment = event.shiftKey ? 40 : 20;
    let width = frame.width;
    let height = frame.height;
    if (event.key === "ArrowRight") width += increment;
    else if (event.key === "ArrowLeft") width -= increment;
    else if (event.key === "ArrowDown") height += increment;
    else if (event.key === "ArrowUp") height -= increment;
    else if (event.key === "Home") {
      width = Math.min(MIN_WIDTH, limits().width);
      height = Math.min(MIN_HEIGHT, limits().height);
    } else if (event.key === "End") {
      width = limits().width;
      height = limits().height;
    } else return;
    event.preventDefault();
    resizeTo(width, height);
  };

  if (!open || typeof document === "undefined") return null;

  const currentStatus = selectedChannel?.status;
  const badgeColor = currentStatus ? statusColor(currentStatus) : "#718198";
  const bodyHeight = Math.max(0, frame.height - HEADER_HEIGHT);

  return createPortal(
    <section
      aria-label="Streaming"
      data-testid="streaming-window"
      className="fixed z-[100] flex flex-col overflow-hidden rounded-xl border border-[#d6e3f2] bg-white shadow-[0_18px_56px_rgba(31,74,120,0.22)]"
      style={{
        left: frame.x,
        top: frame.y,
        width: frame.width,
        height: collapsed ? HEADER_HEIGHT : frame.height,
        maxWidth: "calc(100vw - 16px)",
        maxHeight: "calc(100dvh - 16px)",
        transition: "height 160ms ease",
      }}
    >
      <header
        data-testid="streaming-window-header"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        tabIndex={0}
        aria-label="Move Streaming window using arrow keys"
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          const offset = event.shiftKey ? 40 : 10;
          const directions: Record<string, [number, number]> = {
            ArrowLeft: [-offset, 0], ArrowRight: [offset, 0],
            ArrowUp: [0, -offset], ArrowDown: [0, offset],
          };
          const delta = directions[event.key];
          if (!delta) return;
          event.preventDefault();
          setFrame(current => fitFrame({ ...current, x: current.x + delta[0], y: current.y + delta[1] }, collapsed));
        }}
        className="flex h-[58px] shrink-0 cursor-grab select-none items-center justify-between border-b border-[#e5edf6] bg-[#f8fbff] px-4 active:cursor-grabbing"
        style={{ touchAction: "none" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e8f2ff] text-[#246fbd]">
            <span className="text-[13px] font-bold tracking-tight">MP</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-[0.01em] text-[#20364f]">Streaming</h2>
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-[#e4eaf1] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#566a81]"
                aria-live="polite"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${currentStatus === "streaming" ? "animate-pulse" : ""}`}
                  style={{ backgroundColor: badgeColor }}
                />
                {currentStatus ? statusLabel(currentStatus) : "Waiting"}
              </span>
            </div>
            <p className="truncate text-[11px] text-[#8392a5]">
              {selectedChannel?.label ?? "Analysis output"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <CopyOutputButton
            text={selectedChannel?.text ?? ""}
            compact
            testId="streaming-window-copy"
            className="h-8 w-8 text-[#647b94] hover:bg-[#eaf2fb] hover:text-[#246fbd]"
          />
          <button
            type="button"
            data-testid="streaming-window-collapse"
            onClick={() => {
              const nextCollapsed = !collapsed;
              setFrame(current => fitFrame(current, nextCollapsed));
              setCollapsed(nextCollapsed);
            }}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand Streaming window" : "Collapse Streaming window"}
            title={collapsed ? "Expand" : "Collapse"}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#647b94] transition-colors hover:bg-[#eaf2fb] hover:text-[#246fbd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6ca7e6]"
          >
            {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            type="button"
            data-testid="streaming-window-close"
            onClick={onClose}
            aria-label="Close Streaming window"
            title="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#647b94] transition-colors hover:bg-[#fceeee] hover:text-[#a74444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6ca7e6]"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {!collapsed && (
        <div className="flex min-h-0 flex-1 flex-col bg-white" style={{ height: bodyHeight }}>
          {streams.length > 0 && (
            <div
              role="tablist"
              aria-label="Active analyses"
              className="flex shrink-0 gap-1 overflow-x-auto border-b border-[#edf1f6] px-3 py-2"
            >
              {streams.map((stream) => {
                const isSelected = selectedChannel?.id === stream.id;
                return (
                  <button
                    type="button"
                    role="tab"
                    key={stream.id}
                    aria-selected={isSelected}
                    onClick={() => setSelectedId(stream.id)}
                    className={`flex max-w-[190px] shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6ca7e6] ${
                      isSelected
                        ? "bg-[#edf5ff] font-semibold text-[#246fbd]"
                        : "text-[#65778c] hover:bg-[#f5f8fc]"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        stream.status === "streaming" ? "animate-pulse" : ""
                      }`}
                      style={{ backgroundColor: statusColor(stream.status) }}
                    />
                    <span className="truncate">{stream.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-3">
              <div className="min-w-0 text-xs text-[#77879a]" aria-live="polite">
                {selectedChannel?.message || (selectedChannel ? statusLabel(selectedChannel.status) : "Ready when an analysis starts")}
              </div>
              {isCatchingUp && currentStatus === "streaming" && (
                <span className="shrink-0 text-[10px] font-medium text-[#5083b7]">Receiving live text</span>
              )}
            </div>

            <div
              ref={scrollRef}
              onScroll={handleScroll}
              data-testid="streaming-window-text"
              role="region"
              aria-label="Analysis text"
              aria-live="off"
              tabIndex={0}
              className="custom-scrollbar mx-3 mb-3 min-h-0 flex-1 overflow-y-auto rounded-lg border border-[#e7edf4] bg-[#fbfdff] px-4 py-3 text-[13px] leading-[1.75] text-[#344a62] outline-none focus-visible:ring-2 focus-visible:ring-[#9ac3ee]"
            >
              {displayedText ? (
                <div className="select-text whitespace-pre-wrap break-words">{displayedText}</div>
              ) : (
                <div className="flex min-h-full items-center justify-center py-8 text-center">
                  {!selectedChannel ? (
                    <div>
                      <p className="text-sm font-medium text-[#526a83]">No active analyses</p>
                      <p className="mt-1 text-xs text-[#8a99aa]">Your live evaluations will appear here.</p>
                    </div>
                  ) : selectedChannel.status === "connecting" ? (
                    <div className="max-w-[260px]">
                      <LoaderCircle className="mx-auto mb-3 h-5 w-5 animate-spin text-[#3985cb]" aria-hidden="true" />
                      <p className="text-sm font-medium text-[#526a83]">Connecting to the analysis</p>
                      <p className="mt-1 text-xs text-[#8a99aa]">The evaluation will appear as it arrives.</p>
                    </div>
                  ) : selectedChannel.status === "streaming" ? (
                    <div className="max-w-[260px]">
                      <span className="mx-auto mb-3 block h-2 w-2 animate-pulse rounded-full bg-[#3985cb]" />
                      <p className="text-sm font-medium text-[#526a83]">Waiting for the first words</p>
                      <p className="mt-1 text-xs text-[#8a99aa]">Live text will remain visible here as it arrives.</p>
                    </div>
                  ) : selectedChannel.status === "error" ? (
                    <div className="max-w-[280px]">
                      <CircleAlert className="mx-auto mb-3 h-5 w-5 text-[#b65353]" aria-hidden="true" />
                      <p className="text-sm font-medium text-[#8a4545]">The analysis stopped before sending text</p>
                      <p className="mt-1 text-xs text-[#8a99aa]">{selectedChannel.message || "No output was received."}</p>
                    </div>
                  ) : (
                    <div className="max-w-[260px]">
                      <Check className="mx-auto mb-3 h-5 w-5 text-[#27805c]" aria-hidden="true" />
                      <p className="text-sm font-medium text-[#526a83]">Analysis complete</p>
                      <p className="mt-1 text-xs text-[#8a99aa]">No text output was returned.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!nearBottom && displayedText && (
              <button
                type="button"
                onClick={() => {
                  if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                  nearBottomRef.current = true;
                  setNearBottom(true);
                }}
                className="absolute bottom-14 right-6 rounded-full border border-[#d5e4f4] bg-white px-3 py-1.5 text-[11px] font-medium text-[#3277b9] shadow-sm hover:bg-[#f4f9ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6ca7e6]"
              >
                Jump to latest
              </button>
            )}
          </div>

          {!nearBottom && displayedText && (
            <div className="sr-only" aria-live="polite">New analysis text is available. Use Jump to latest to follow it.</div>
          )}

          <button
            type="button"
            data-testid="streaming-window-resize"
            aria-label="Resize Streaming window"
            aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home End"
            title="Drag to resize. Use arrow keys to adjust size."
            onPointerDown={startResize}
            onPointerMove={moveResize}
            onPointerUp={finishResize}
            onPointerCancel={finishResize}
            onKeyDown={handleResizeKeyDown}
            className="absolute bottom-0 right-0 z-10 flex h-8 w-8 cursor-nwse-resize items-center justify-center rounded-tl-lg text-[#7793af] hover:bg-[#edf5ff] hover:text-[#246fbd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6ca7e6]"
            style={{ touchAction: "none" }}
          >
            <Grip size={15} aria-hidden="true" />
          </button>
        </div>
      )}
    </section>,
    document.body,
  );
}
