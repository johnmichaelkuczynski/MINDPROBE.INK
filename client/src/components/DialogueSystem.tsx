import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, RotateCcw, User, Brain } from "lucide-react";
import { DialogueMessage } from "@/types/analysis";

interface DialogueSystemProps {
  analysisId: string | null;
  messages: DialogueMessage[];
  onSendMessage: (message: string) => void;
  onRegenerateAnalysis: (concerns: string) => void;
  isSending: boolean;
}

export function DialogueSystem({
  analysisId,
  messages,
  onSendMessage,
  onRegenerateAnalysis,
  isSending
}: DialogueSystemProps) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim() && analysisId) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  const handleRegenerate = () => {
    if (input.trim() && analysisId) {
      onRegenerateAnalysis(input.trim());
      setInput("");
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  return (
    <Card className="border-border-light shadow-sm">
      <div className="border-b border-border-light p-6">
        <h2 className="text-xl font-semibold">Analysis Dialogue</h2>
        <p className="text-gray-600 mt-1">Discuss and contest the analysis results</p>
      </div>
      
      <CardContent className="p-6">
        <ScrollArea className="h-64 mb-6 pr-4">
          <div className="space-y-4" data-testid="dialogue-history">
            {messages.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No dialogue messages yet. Start a conversation about the analysis results.</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div key={message.id} className="flex space-x-3">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.sender === 'user' 
                      ? 'bg-primary-blue' 
                      : 'bg-success-green'
                  }`}>
                    {message.sender === 'user' 
                      ? <User className="h-4 w-4 text-white" />
                      : <Brain className="h-4 w-4 text-white" />
                    }
                  </div>
                </div>
                <div className="flex-1">
                  <div className={`rounded-lg p-3 ${
                    message.sender === 'user' 
                      ? 'bg-blue-50' 
                      : 'bg-green-50'
                  }`}>
                    <p className="text-sm">{message.message}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimeAgo(new Date(message.createdAt))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <div className="flex space-x-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Express your concerns about the analysis or ask questions..."
            className="flex-1 resize-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
            rows={3}
            data-testid="input-dialogue"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div className="flex flex-col space-y-2">
            <Button
              onClick={handleSend}
              disabled={!input.trim() || !analysisId || isSending}
              className="bg-primary-blue text-white hover:bg-blue-700"
              data-testid="button-send-dialogue"
            >
              <Send className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleRegenerate}
              disabled={!input.trim() || !analysisId || isSending}
              className="bg-orange-500 text-white hover:bg-orange-600"
              title="Regenerate with concerns"
              data-testid="button-regenerate-analysis"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
