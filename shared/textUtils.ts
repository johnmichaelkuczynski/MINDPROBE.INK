export interface TextChunk {
  id: string;
  content: string;
  wordCount: number;
  selected: boolean;
}

export class TextChunkingService {
  static countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  static createChunks(text: string, maxWords: number = 1000): TextChunk[] {
    if (this.countWords(text) <= maxWords) {
      return [{
        id: 'single',
        content: text,
        wordCount: this.countWords(text),
        selected: true
      }];
    }

    const words = text.trim().split(/\s+/);
    const chunks: TextChunk[] = [];
    
    for (let i = 0; i < words.length; i += maxWords) {
      const chunkWords = words.slice(i, i + maxWords);
      const chunkContent = chunkWords.join(' ');
      
      chunks.push({
        id: `chunk-${chunks.length + 1}`,
        content: chunkContent,
        wordCount: chunkWords.length,
        selected: false
      });
    }

    return chunks;
  }

  static needsChunking(text: string, maxWords: number = 1000): boolean {
    return this.countWords(text) > maxWords;
  }

  static getSelectedChunksText(chunks: TextChunk[]): string {
    return chunks
      .filter(chunk => chunk.selected)
      .map(chunk => chunk.content)
      .join('\n\n--- CHUNK SEPARATOR ---\n\n');
  }
}