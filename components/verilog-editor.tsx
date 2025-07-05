"use client"

import type React from "react"
import { useRef, useEffect, useState } from "react"
import {Activity,Cpu} from "lucide-react"

interface VerilogEditorProps {
  content: string
  onChange?: (content: string) => void
  readOnly?: boolean
  fileName?: string
}

export default function VerilogEditor({ content, onChange, readOnly = false, fileName }: VerilogEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const [lineCount, setLineCount] = useState(1)

  useEffect(() => {
    setLineCount(content.split("\n").length)
  }, [content])

  // Synchronize scroll between line numbers and editor
  const handleScroll = () => {
    if (editorRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = editorRef.current.scrollTop
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    onChange?.(newContent)
    setLineCount(newContent.split("\n").length)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = content.substring(0, start) + "    " + content.substring(end)
      onChange?.(newContent)

      // Set cursor position after the inserted tab
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4
      }, 0)
    }
  }

  const getFileIcon = (fileName: string) => {
    if (fileName?.endsWith("-testbench.v")) {
      return <Activity className="w-3 h-3"/>
    } else if (fileName?.endsWith(".v")) {
      return <Cpu className="w-3 h-3"/>
    } else if (fileName?.endsWith(".vhd") || fileName?.endsWith(".vhdl")) {
      return "🔧"
    } else if (fileName?.endsWith(".sv")) {
      return "🚀"
    }
    return "📄"
  }

  return (
    <div className="h-full flex flex-col bg-white min-h-0">
      {/* File header */}
      {fileName && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <span className="text-lg">{getFileIcon(fileName)}</span>
          <span className="font-medium text-gray-900">{fileName}</span>
          <span className="text-xs text-gray-500 ml-auto">
            {lineCount} lines • {content.length} chars
          </span>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 flex relative min-h-0">
        {/* Line numbers */}
        <div
          ref={lineNumbersRef}
          className="w-16 bg-gray-50 border-r border-gray-200 text-right text-sm text-gray-500 font-mono overflow-hidden select-none flex-shrink-0"
          style={{
            lineHeight: "1.5rem", // Match textarea line height
            fontSize: "14px", // Match textarea font size
          }}
        >
          <div className="py-4 px-2">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1} className="h-6 flex items-center justify-end pr-2" style={{ lineHeight: "1.5rem" }}>
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Editor container */}
        <div className="flex-1 relative min-h-0">
          <textarea
            ref={editorRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            readOnly={readOnly}
            className="absolute inset-0 w-full h-full p-4 font-mono text-sm resize-none border-none outline-none bg-white text-gray-900 overflow-auto"
            style={{
              tabSize: 4,
              caretColor: "#000000",
              lineHeight: "1.5rem", // Match line numbers
              fontSize: "14px", // Match line numbers
            }}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            placeholder={readOnly ? "" : "Start typing your Verilog code..."}
          />
        </div>
      </div>

      {/* Status bar */}
      <div className="h-6 bg-gray-50 border-t border-gray-200 flex items-center justify-between px-4 text-xs text-gray-500 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <span>Verilog</span>
          <span>UTF-8</span>
          <span>LF</span>
        </div>
        <div className="flex items-center space-x-2">
          {!readOnly && <span>✏️ Editable</span>}
          {readOnly && <span>👁️ Read-only</span>}
        </div>
      </div>
    </div>
  )
}
