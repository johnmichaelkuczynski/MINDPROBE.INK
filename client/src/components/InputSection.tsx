import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Clipboard, Upload, X, File } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InputSectionProps {
  inputText: string;
  onTextChange: (text: string) => void;
  additionalContext: string;
  onContextChange: (context: string) => void;
  onFileUpload: (file: File) => void;
  isUploading: boolean;
}

export function InputSection({
  inputText,
  onTextChange,
  additionalContext,
  onContextChange,
  onFileUpload,
  isUploading
}: InputSectionProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const characterCount = inputText.length;
  const wordCount = inputText.trim().split(/\s+/).filter(word => word.length > 0).length;

  const handleClearText = () => {
    onTextChange("");
  };

  const handlePasteText = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onTextChange(inputText + text);
      toast({
        title: "Text pasted",
        description: "Content has been pasted from clipboard",
      });
    } catch (error) {
      toast({
        title: "Paste failed",
        description: "Unable to access clipboard",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      onFileUpload(file);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      
      // Check file type
      const allowedTypes = ['.pdf', '.docx', '.txt'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (allowedTypes.includes(fileExtension)) {
        setUploadedFile(file);
        onFileUpload(file);
        toast({
          title: "File uploaded",
          description: `${file.name} ready for processing`,
        });
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload PDF, Word (.docx), or Text (.txt) files only",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Text Input */}
      <Card className={`border-border-light shadow-sm transition-colors ${
        isDragging ? 'border-primary-blue border-2 bg-blue-50' : ''
      }`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Text Input</h3>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearText}
                data-testid="button-clear-text"
                className="text-gray-500 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePasteText}
                data-testid="button-paste-text"
                className="text-gray-500 hover:text-primary-blue"
              >
                <Clipboard className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div 
            className={`relative ${isDragging ? 'pointer-events-none' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Textarea
              value={inputText}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Enter or paste your text here for analysis. You can also drag and drop files directly onto this text area..."
              className={`min-h-80 resize-none focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-colors ${
                isDragging ? 'bg-blue-50 border-primary-blue border-2 border-dashed' : ''
              }`}
              data-testid="input-text"
            />
            
            {/* Drag overlay */}
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-blue-50 bg-opacity-90 border-2 border-dashed border-primary-blue rounded-md pointer-events-none">
                <div className="text-center">
                  <Upload className="h-12 w-12 text-primary-blue mx-auto mb-2" />
                  <p className="text-lg font-medium text-primary-blue">Drop file to upload</p>
                  <p className="text-sm text-gray-600">PDF, Word, or Text files</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <span data-testid="text-character-count">{characterCount} characters</span>
            <span data-testid="text-word-count">{wordCount} words</span>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card className="border-border-light shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">File Upload</h3>
          
          <div
            className="border-2 border-dashed border-border-light rounded-lg p-8 text-center hover:border-primary-blue transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            data-testid="file-upload-area"
          >
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                <Upload className="text-primary-blue text-2xl h-8 w-8" />
              </div>
              <div>
                <h4 className="text-lg font-medium">Upload Document</h4>
                <p className="text-gray-500 mt-1">Drag and drop or click to browse</p>
                <p className="text-sm text-gray-400 mt-2">Supports: PDF, Word (.docx), Text (.txt)</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-file"
            />
          </div>
          
          {uploadedFile && (
            <div className="mt-4">
              <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <File className="h-5 w-5 text-success-green" />
                <div className="flex-1">
                  <p className="font-medium text-success-green" data-testid="text-filename">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-600" data-testid="text-filesize">{formatFileSize(uploadedFile.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  data-testid="button-remove-file"
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          {isUploading && (
            <div className="mt-4 text-center text-gray-500">
              <div className="inline-flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-blue"></div>
                <span>Processing file...</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Context */}
      <Card className="border-border-light shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Additional Context (Optional)</h3>
          <Textarea
            value={additionalContext}
            onChange={(e) => onContextChange(e.target.value)}
            placeholder="Add any relevant information that might influence the analysis..."
            className="min-h-32 resize-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
            data-testid="input-additional-context"
          />
        </CardContent>
      </Card>
    </div>
  );
}
