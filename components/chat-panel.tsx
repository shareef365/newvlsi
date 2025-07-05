"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Send, ChevronDown, AlertCircle, Code, Loader2 } from "lucide-react"
import ChatMessageComponent from "./chat-message"
import { d1Client } from "@/lib/d1-client"
import type { ChatMessage } from "@/app/page"

interface ChatPanelProps {
  messages: ChatMessage[]
  onSendMessage: (message: ChatMessage) => void
  onCodeGenerated?: (mainFile: any, testbenchFile: any) => Promise<any>
  user?: any
  currentProject?: any
  isGeneratingInitial?: boolean
}

export default function ChatPanel({
  messages,
  onSendMessage,
  onCodeGenerated,
  user,
  currentProject,
  isGeneratingInitial = false,
}: ChatPanelProps) {
  const [input, setInput] = useState("")
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const scrollToBottom = () => {
    if (mounted && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  useEffect(() => {
    if (mounted) {
      scrollToBottom()
    }
  }, [messages, mounted])

  // Auto-resize textarea
  useEffect(() => {
    if (mounted && textareaRef.current) {
      textareaRef.current.style.height = "42px"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input, mounted])

  const processVerilogContent = (content: string): string => {
    if (!content) return ""

    console.log("Processing content:", content.substring(0, 100) + "...")

    // Handle various newline escape patterns
    let processed = content
      .replace(/\\n/g, "\n") // Convert \n to actual newlines
      .replace(/\\r\\n/g, "\n") // Convert \r\n to newlines
      .replace(/\\r/g, "\n") // Convert \r to newlines
      .replace(/\\t/g, "    ") // Convert \t to 4 spaces
      .replace(/\\\\/g, "\\") // Unescape backslashes

    // Clean up any HTML entities
    processed = processed
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")

    // Normalize line endings and clean up extra whitespace
    processed = processed
      .replace(/\r\n/g, "\n") // Normalize Windows line endings
      .replace(/\r/g, "\n") // Normalize old Mac line endings
      .replace(/\n\s*\n\s*\n/g, "\n\n") // Remove excessive blank lines
      .replace(/[ \t]+$/gm, "") // Remove trailing whitespace
      .trim()

    console.log("Processed content:", processed.substring(0, 100) + "...")
    return processed
  }

  const generateVLSICode = async (prompt: string) => {
    setIsGenerating(true)
    setLastError(null)

    try {
      console.log("Sending request to generate VLSI code...")

      const result = await d1Client.generateVLSICode(prompt, user?.id, currentProject?.id)

      console.log("API response:", result)

      if (result.error && !result.rawResponse) {
        setLastError(result.error)
        throw new Error(result.error)
      }

      // Handle successful generation
      if (result.mainFile && result.testbenchFile) {
        // Process content to ensure proper formatting
        const processedMainFile = {
          ...result.mainFile,
          content: processVerilogContent(result.mainFile.content),
        }

        const processedTestbenchFile = {
          ...result.testbenchFile,
          content: processVerilogContent(result.testbenchFile.content),
        }

        console.log("Calling onCodeGenerated...")

        // CRITICAL FIX: Wait for the files to be created and get the actual file names
        const createdFiles = await onCodeGenerated?.(processedMainFile, processedTestbenchFile)

        console.log("Files created:", createdFiles)

        // Add AI response to chat with actual file names
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: ` **Code Generated Successfully!**\n\n**Files Created:**\n• ${createdFiles?.[0]?.name || processedMainFile.name}\n• ${createdFiles?.[1]?.name || processedTestbenchFile.name}\n\nThe files have been added to your project and are ready for simulation.`,
          timestamp: new Date(),
        }
        onSendMessage(aiMessage)
      } else if (result.debugInfo) {
        // Handle debug response
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: `🔍 **Debug Analysis Complete**\n\n**Errors Found:**\n${result.debugInfo.errors.map((e) => `• ${e}`).join("\n")}\n\n**Suggested Fixes:**\n${result.debugInfo.fixes.map((f) => `• ${f}`).join("\n")}`,
          timestamp: new Date(),
        }
        onSendMessage(aiMessage)
      } else if (result.rawResponse) {
        // Handle case where we couldn't parse the response properly
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: `⚠️ **Partial Response Received**\n\n${result.suggestion || "The AI generated a response, but it wasn't in the expected format."}\n\n**Raw AI Output:**\n\`\`\`\n${result.rawResponse}\n\`\`\`\n\n💡 **Tip:** Try rephrasing your request with more specific details.`,
          timestamp: new Date(),
        }
        onSendMessage(aiMessage)
      } else {
        throw new Error("Unexpected response format from API")
      }
    } catch (error) {
      console.error("Error generating VLSI code:", error)
      setLastError(error instanceof Error ? error.message : "Unknown error")

      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `❌ **Generation Failed**\n\n**Error:** ${error instanceof Error ? error.message : "Failed to generate code"}\n\n**Troubleshooting:**\n• Try a simpler request (e.g., "Generate a 2-bit adder")\n• Be more specific about inputs/outputs\n• Ensure your prompt is clear and concise`,
        timestamp: new Date(),
      }
      onSendMessage(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendMessage = async (message: string) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
      timestamp: new Date(),
    }

    onSendMessage(userMessage)

    // Generate VLSI code using your vlsigpt
    await generateVLSICode(message)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isEnhancing && !isGenerating && !isGeneratingInitial && mounted) {
      setIsEnhancing(true)
      handleSendMessage(input.trim())
      setInput("")
      setTimeout(() => setIsEnhancing(false), 1000)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && mounted && !isGenerating && !isGeneratingInitial) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleEditMessage = (messageId: string) => {
    if (mounted) {
      console.log("Edit message:", messageId)
      // TODO: Implement edit functionality
    }
  }

  const handleDeleteMessage = (messageId: string) => {
    if (mounted) {
      console.log("Delete message:", messageId)
      // TODO: Implement delete functionality
    }
  }

  const handleCopyMessage = (content: string) => {
    if (mounted) {
      console.log("Copied message:", content)
      // Could show a toast notification here
    }
  }

  // Quick prompt suggestions
  const quickPrompts = [
    "Generate a 2-bit full adder",
    "Create a 4-bit counter with reset",
    "Generate an 8-bit shift register",
    "Create a 2-to-1 multiplexer",
  ]

  // Show simple loading state until mounted
  if (!mounted) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-center text-gray-500">Loading chat...</div>
        </div>
      </div>
    )
  }

  const isAnyGenerating = isGenerating || isGeneratingInitial

  return (
    <div className="h-full flex flex-col bg-white min-h-0">
      {/* Generation Status Banner */}
      {isGeneratingInitial && (
        <div className="bg-blue-50 border-b border-blue-200 p-3 flex items-center gap-2 flex-shrink-0">
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
          <span className="text-sm text-blue-700 flex-1">Setting up your project and generating VLSI code...</span>
        </div>
      )}

      {/* Error Banner */}
      {lastError && (
        <div className="bg-red-50 border-b border-red-200 p-3 flex items-center gap-2 flex-shrink-0">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 flex-1">{lastError}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLastError(null)}
            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 flex-shrink-0"
          >
            ×
          </Button>
        </div>
      )}

      {/* Quick Prompts (show when no messages and not generating) */}
      {messages.length === 0 && !isGeneratingInitial && (
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Start:</h4>
          <div className="grid grid-cols-1 gap-2">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => setInput(prompt)}
                className="text-left text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded border border-blue-200 transition-colors flex items-center gap-2"
                disabled={isAnyGenerating}
              >
                <Code className="w-4 h-4 flex-shrink-0" />
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {messages.map((message, index) => (
          <ChatMessageComponent
            key={`${message.id}-${index}`}
            message={message}
            onEdit={handleEditMessage}
            onDelete={handleDeleteMessage}
            onCopy={handleCopyMessage}
          />
        ))}
        {isGenerating && (
          <div className="flex w-full px-4 py-3">
            <div className="flex items-center gap-2">
              <img className="w-3 h-3" src="/loading.gif" alt="" />
              <span className="text-sm text-gray-500">Generating ...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="relative z-10 flex w-full flex-col bg-white mx-auto max-w-full px-2 pb-2 flex-shrink-0">
        {/* Form container */}
        <div className="rounded-xl">
          <form
            onSubmit={handleSubmit}
            className="focus-within:border-blue-600 bg-white border-gray-400 relative rounded-xl border shadow-[0_2px_2px_rgba(0,0,0,0.04),0_8px_8px_-8px_rgba(0,0,0,0.04)] transition-shadow"
          >
            {/* Textarea container */}
            <div className="relative z-10 grid min-h-0 rounded-xl bg-white">
              <label className="sr-only" htmlFor="chat-main-textarea">
                Chat Input
              </label>
              <textarea
                ref={textareaRef}
                id="chat-main-textarea"
                name="content"
                placeholder={
                  isGeneratingInitial
                    ? "Setting up project..."
                    : isGenerating
                      ? "Generating code..."
                      : "Describe the VLSI circuit you want to create..."
                }
                spellCheck={false}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className={`resize-none overflow-auto w-full flex-1 bg-transparent p-3 pb-1.5 text-sm outline-none ring-0 placeholder:text-gray-500 ${
                  isEnhancing || isAnyGenerating ? "animate-pulse text-gray-400" : ""
                }`}
                style={{
                  height: "42px",
                  minHeight: "42px",
                  maxHeight: "120px",
                }}
                disabled={isEnhancing || isAnyGenerating}
              />

              {/* Bottom controls */}
              <div className="flex items-center gap-1 p-3">
                {/* Model selector */}
                <div className="flex items-end gap-0.5 sm:gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-4 text-xs text-gray-500 hover:text-gray-900 border-transparent bg-transparent"
                    type="button"
                    disabled={isAnyGenerating}
                  >
                    <span>vlsigpt</span>
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                {/* Right controls */}
                <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
                  {/* Send button */}
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!input.trim() || isAnyGenerating}
                    className="ml-1 size-7 rounded-md bg-gray-900 hover:bg-gray-700 text-white border-gray-900 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-400"
                  >
                    <Send className="w-4 h-4" />
                    <span className="sr-only">Send Message</span>
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Disclaimer */}
        <p className="py-2 text-center text-xs text-gray-500">
          VLSI Code Generator powered by vlsigpt 
        </p>
      </div>
    </div>
  )
}
