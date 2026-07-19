import { useState } from "react";
import { TextChunk } from "@shared/textUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, FileText, CheckSquare, Square } from "lucide-react";

interface ChunkSelectorProps {
  chunks: TextChunk[];
  onChunksChange: (chunks: TextChunk[]) => void;
  onProceed: () => void;
  onCancel: () => void;
}

export function ChunkSelector({ chunks, onChunksChange, onProceed, onCancel }: ChunkSelectorProps) {
  const selectedCount = chunks.filter(chunk => chunk.selected).length;
  const totalWords = chunks.reduce((sum, chunk) => sum + (chunk.selected ? chunk.wordCount : 0), 0);

  const toggleChunk = (chunkId: string) => {
    const updatedChunks = chunks.map(chunk =>
      chunk.id === chunkId ? { ...chunk, selected: !chunk.selected } : chunk
    );
    onChunksChange(updatedChunks);
  };

  const selectAll = () => {
    const updatedChunks = chunks.map(chunk => ({ ...chunk, selected: true }));
    onChunksChange(updatedChunks);
  };

  const selectNone = () => {
    const updatedChunks = chunks.map(chunk => ({ ...chunk, selected: false }));
    onChunksChange(updatedChunks);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          <CardTitle>Text Too Long - Select Chunks</CardTitle>
        </div>
        <p className="text-sm text-gray-600">
          Your text is longer than 1000 words. Please select which chunks to analyze:
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Selection controls */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={selectAll}
              data-testid="button-select-all"
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              Select All
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={selectNone}
              data-testid="button-select-none"
            >
              <Square className="h-4 w-4 mr-1" />
              Select None
            </Button>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="secondary">
              {selectedCount} of {chunks.length} chunks selected
            </Badge>
            <Badge variant="outline">
              {totalWords} words total
            </Badge>
          </div>
        </div>

        {/* Chunks list */}
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {chunks.map((chunk, index) => (
              <div
                key={chunk.id}
                className={`border rounded-lg p-4 transition-colors ${
                  chunk.selected ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={chunk.selected}
                    onCheckedChange={() => toggleChunk(chunk.id)}
                    className="mt-1"
                    data-testid={`checkbox-chunk-${index + 1}`}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-sm">
                        Chunk {index + 1}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {chunk.wordCount} words
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-700 line-clamp-3">
                      {chunk.content.substring(0, 200)}
                      {chunk.content.length > 200 && '...'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={onCancel}
            data-testid="button-cancel-chunking"
          >
            Cancel
          </Button>
          <Button 
            onClick={onProceed}
            disabled={selectedCount === 0}
            data-testid="button-proceed-analysis"
          >
            Proceed with Analysis ({selectedCount} chunks)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}