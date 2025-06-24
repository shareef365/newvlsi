"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Download, FileText, ChevronRight, Play, Loader2 } from "lucide-react"
import VerilogEditor from "./verilog-editor"
import type { FileNode } from "@/app/page"

interface FileTreePanelProps {
  files: FileNode[]
  onFileSelect: (file: FileNode) => void
  activeFile: FileNode | null
  onFileUpdate: (fileId: string, content: string) => void
  showFileTree?: boolean
  isGenerating?: boolean
}

export default function FileTreePanel({
  files,
  onFileSelect,
  activeFile,
  onFileUpdate,
  showFileTree = true,
  isGenerating = false,
}: FileTreePanelProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const getBreadcrumb = () => {
    if (!activeFile) return []
    return [activeFile.name]
  }

  const handleCopyContent = () => {
    if (activeFile?.content && typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(activeFile.content)
    }
  }

  const handleDownloadFile = () => {
    if (!activeFile) return

    const blob = new Blob([activeFile.content || ""], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = activeFile.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const breadcrumb = getBreadcrumb()

  if (!mounted) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  // If showFileTree is false, only show the editor part
  if (!showFileTree) {
    return (
      <div className="h-full flex flex-col min-h-0">
        {/* Header with breadcrumb and actions */}
        <div className="flex w-full shrink-0 items-center pl-3 pr-2 text-sm font-medium text-gray-500 h-12 justify-between gap-2 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex min-w-0 items-center gap-1">
            {breadcrumb.map((item, index) => (
              <div key={index} className="flex items-center gap-1">
                <div className="whitespace-nowrap font-medium text-gray-900">{item}</div>
                {index < breadcrumb.length - 1 && <ChevronRight className="w-4 h-4 text-gray-400" />}
              </div>
            ))}
            {isGenerating && (
              <div className="flex items-center gap-1 ml-2">
                <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                <span className="text-xs text-blue-600">Generating...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {activeFile?.name.includes("testbench") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-green-600 hover:text-green-700 hover:bg-green-50"
                aria-label="Run Simulation"
                disabled={isGenerating}
              >
                <Play className="w-4 h-4 mr-1" />
                Simulate
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-gray-500"
              aria-label="Show Diff"
              disabled={isGenerating}
            >
              <FileText className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-gray-500"
              aria-label="Copy"
              onClick={handleCopyContent}
              disabled={isGenerating}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-gray-500"
              aria-label="Download"
              onClick={handleDownloadFile}
              disabled={isGenerating}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Editor Content - Scrollable */}
        <div className="flex-1 min-h-0">
          {activeFile ? (
            <VerilogEditor
              content={activeFile.content || ""}
              onChange={(content) => onFileUpdate(activeFile.id, content)}
              fileName={activeFile.name}
              readOnly={isGenerating}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 bg-gray-50">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
                  {isGenerating ? <Loader2 className="w-16 h-16 animate-spin text-blue-500" /> : "📄"}
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {isGenerating ? "Generating Files..." : "No File Selected"}
                </h3>
                <p className="text-gray-600 mb-4">
                  {isGenerating
                    ? "Please wait while AI creates your Verilog modules"
                    : "Select a file from the sidebar to view and edit"}
                </p>
                <div className="text-sm text-gray-500">
                  <p>
                    💡 <strong>Tip:</strong>{" "}
                    {isGenerating
                      ? "Files will appear automatically when generation is complete"
                      : "Use the chat to generate new Verilog modules"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Original full layout with file tree (not used in current layout)
  return (
    <div className="h-full flex flex-row min-h-0">
      {/* This is the original implementation - keeping for reference */}
      <div className="flex-1 min-h-0">
        {activeFile ? (
          <VerilogEditor
            content={activeFile.content || ""}
            onChange={(content) => onFileUpdate(activeFile.id, content)}
            fileName={activeFile.name}
            readOnly={isGenerating}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 bg-gray-50">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
                {isGenerating ? <Loader2 className="w-16 h-16 animate-spin text-blue-500" /> : "📄"}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {isGenerating ? "Generating Files..." : "No File Selected"}
              </h3>
              <p className="text-gray-600 mb-4">
                {isGenerating
                  ? "Please wait while AI creates your Verilog modules"
                  : "Select a file from the sidebar to view and edit"}
              </p>
              <div className="text-sm text-gray-500">
                <p>
                  💡 <strong>Tip:</strong>{" "}
                  {isGenerating
                    ? "Files will appear automatically when generation is complete"
                    : "Use the chat to generate new Verilog modules"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
