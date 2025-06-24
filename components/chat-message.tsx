"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Copy } from "lucide-react"
import type { ChatMessage } from "@/app/page"

interface ChatMessageProps {
  message: ChatMessage
  onEdit?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  onCopy?: (content: string) => void
}

// Simple markdown-like text formatter
function formatMessageContent(content: string): JSX.Element {
  const lines = content.split("\n")
  const elements: JSX.Element[] = []

  lines.forEach((line, index) => {
    // Handle headers
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={index} className="text-xl font-bold mb-2">
          {line.substring(2)}
        </h1>,
      )
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={index} className="text-lg font-bold mb-2">
          {line.substring(3)}
        </h2>,
      )
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={index} className="text-base font-bold mb-1">
          {line.substring(4)}
        </h3>,
      )
    }
    // Handle bold text
    else if (line.includes("**")) {
      const parts = line.split("**")
      const formatted = parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold">
            {part}
          </strong>
        ) : (
          part
        ),
      )
      elements.push(
        <p key={index} className="mb-1">
          {formatted}
        </p>,
      )
    }
    // Handle bullet points
    else if (line.startsWith("• ") || line.startsWith("- ")) {
      elements.push(
        <div key={index} className="flex items-start mb-1">
          <span className="text-blue-500 mr-2">•</span>
          <span>{line.substring(2)}</span>
        </div>,
      )
    }
    // Handle numbered lists
    else if (line.match(/^\d+\.\s/)) {
      elements.push(
        <div key={index} className="mb-1 ml-4">
          {line}
        </div>,
      )
    }
    // Handle code blocks (simple)
    else if (line.startsWith("```")) {
      // Skip code block markers for now
      return
    }
    // Handle inline code
    else if (line.includes("`")) {
      const parts = line.split("`")
      const formatted = parts.map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} className="bg-gray-100 px-1 rounded text-sm font-mono">
            {part}
          </code>
        ) : (
          part
        ),
      )
      elements.push(
        <p key={index} className="mb-1">
          {formatted}
        </p>,
      )
    }
    // Handle empty lines
    else if (line.trim() === "") {
      elements.push(<br key={index} />)
    }
    // Regular text
    else {
      elements.push(
        <p key={index} className="mb-1">
          {line}
        </p>,
      )
    }
  })

  return <div>{elements}</div>
}

export default function ChatMessageComponent({ message, onEdit, onDelete, onCopy }: ChatMessageProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleCopy = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(message.content)
      onCopy?.(message.content)
    }
  }

  const isUser = message.role === "user"

  return (
    <div
      className="flex w-full px-4 py-3"
      onMouseEnter={() => mounted && setIsHovered(true)}
      onMouseLeave={() => mounted && setIsHovered(false)}
    >
      <div className="group w-full gap-2" data-testid="message" role="listitem">
        <div className="relative flex items-start gap-2">
          {/* Avatar */}
          <a className="flex items-center" href={`#${message.id}`}>
            <span className="bg-gray-400 relative flex shrink-0 select-none items-center justify-center overflow-hidden after:absolute after:inset-0 after:border after:mix-blend-darken dark:after:mix-blend-lighten size-6 rounded-lg text-xs after:rounded-lg">
              {isUser ? (
                <img
                  className="h-full w-full object-cover aspect-auto"
                  alt="User Avatar"
                  src="https://vercel.com/api/www/avatar/3myGBRNbUEFymi8z4nuDuoOc"
                />
              ) : (
                <div className="bg-blue-500 text-white text-xs font-medium">AI</div>
              )}
            </span>
          </a>

          {/* Message Content */}
          <div className="min-w-0 flex-1 translate-y-[0.5px]">
            <div className="flex flex-1 -translate-x-1 flex-col items-stretch gap-2">
              <div className="prose prose-sm prose-gray min-w-0 break-words w-full pl-1">
                <div className="text-sm text-gray-900">{formatMessageContent(message.content)}</div>
              </div>
            </div>
          </div>

          {/* Message Actions - Only show after mount */}
          {mounted && (
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10">
              <div
                className={`bg-white w-fit items-center gap-1 rounded-[10px] p-1 shadow-sm pointer-events-auto sticky top-3 flex -translate-y-1.5 transition-opacity duration-200 md:top-5 ${
                  isHovered ? "opacity-100" : "opacity-0"
                }`}
              >
                {/* Edit Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 min-w-6 rounded-md px-1 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                  onClick={() => onEdit?.(message.id)}
                  aria-label="Edit Message"
                >
                  <Edit className="w-4 h-4" />
                </Button>

                {/* Separator */}
                <div className="shrink-0 bg-gray-400 h-5 w-px" />

                {/* Delete Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 min-w-6 rounded-md px-1 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                  onClick={() => onDelete?.(message.id)}
                  aria-label="Delete Message"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>

                {/* Separator */}
                <div className="shrink-0 bg-gray-400 h-5 w-px" />

                {/* Copy Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 min-w-6 rounded-md px-1 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                  onClick={handleCopy}
                  aria-label="Copy Message"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
