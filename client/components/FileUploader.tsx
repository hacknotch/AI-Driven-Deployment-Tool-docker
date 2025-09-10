import React, { useState, useRef, DragEvent, ChangeEvent } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, File, X, Github, Link } from "lucide-react";

interface FileUploaderProps {
  onFileSelect?: (files: FileList) => void;
  onGitHubSubmit?: (url: string) => void;
  onContinue?: () => void;
  className?: string;
}

export default function FileUploader({
  onFileSelect,
  onGitHubSubmit,
  onContinue,
  className,
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [githubUrl, setGithubUrl] = useState("");
  const [activeTab, setActiveTab] = useState("files");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFiles = (files: FileList) => {
    const fileArray = Array.from(files);
    setSelectedFiles(fileArray);
    onFileSelect?.(files);
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleGitHubSubmit = () => {
    if (githubUrl.trim()) {
      onGitHubSubmit?.(githubUrl.trim());
    }
  };

  const isValidGitHubUrl = (url: string) => {
    const githubRegex = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+/;
    return githubRegex.test(url);
  };

  return (
    <div className={cn("space-y-6", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border-slate-700">
          <TabsTrigger value="files" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload Files
          </TabsTrigger>
          <TabsTrigger value="github" className="flex items-center gap-2">
            <Github className="w-4 h-4" />
            GitHub Repository
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-4">
          {/* Drag & Drop Area */}
          <Card
            className={cn(
              "relative border-2 border-dashed transition-all duration-300 cursor-pointer",
              isDragOver
                ? "border-neon-cyan bg-neon-cyan/10 shadow-lg shadow-neon-cyan/20"
                : "border-slate-600 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800/70",
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-slate-700 flex items-center justify-center">
                <Upload className="w-8 h-8 text-slate-400" />
              </div>

              <h3 className="text-lg font-semibold text-white mb-2">
                {isDragOver ? "Drop your files here" : "Drag & drop your files"}
              </h3>

              <p className="text-slate-400 mb-4">
                or{" "}
                <span className="text-neon-cyan hover:underline">browse files</span>{" "}
                to upload
              </p>

              <p className="text-xs text-slate-500">
                Supports ZIP, TAR, and individual files
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInput}
              accept=".zip,.tar,.tar.gz,.tgz,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.php,.rb,.go,.rs,.html,.css,.json,.xml,.yml,.yaml"
            />
          </Card>
        </TabsContent>

        <TabsContent value="github" className="space-y-4">
          {/* GitHub URL Input */}
          <Card className="bg-slate-800/50 border-slate-700 p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
                  <Github className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Connect GitHub Repository</h3>
                  <p className="text-sm text-slate-400">Enter your GitHub repository URL</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="github-url" className="text-white">
                  Repository URL
                </Label>
                <Input
                  id="github-url"
                  type="url"
                  placeholder="https://github.com/username/repository"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>

              {githubUrl && !isValidGitHubUrl(githubUrl) && (
                <p className="text-sm text-red-400">
                  Please enter a valid GitHub repository URL
                </p>
              )}

              <Button
                onClick={handleGitHubSubmit}
                disabled={!githubUrl.trim() || !isValidGitHubUrl(githubUrl)}
                className="w-full bg-gradient-to-r from-neon-blue to-neon-purple hover:from-neon-cyan hover:to-neon-pink text-white font-semibold py-3 shadow-lg hover:shadow-neon-blue/30 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <Link className="w-4 h-4 mr-2" />
                Connect Repository
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Selected Files */}
      {activeTab === "files" && selectedFiles.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <div className="p-4">
            <h4 className="text-sm font-semibold text-white mb-3">
              Selected Files
            </h4>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <File className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-white font-medium truncate max-w-[200px]">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Continue Button for Files */}
      {activeTab === "files" && selectedFiles.length > 0 && (
        <div className="flex justify-center">
          <Button
            onClick={onContinue}
            className="bg-gradient-to-r from-neon-blue to-neon-purple hover:from-neon-cyan hover:to-neon-pink text-white font-semibold px-8 py-3 shadow-lg hover:shadow-neon-blue/30 transition-all duration-300 transform hover:scale-105"
          >
            Upload & Continue
          </Button>
        </div>
      )}
    </div>
  );
}
