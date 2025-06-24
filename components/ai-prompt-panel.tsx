"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Send, Loader2, Zap } from "lucide-react"
// import { useCompletion } from "ai/react" // Removed AI SDK dependency

interface AIPromptPanelProps {
  onCodeGenerated: (mainFile: any, testbenchFile: any) => void
}

export default function AIPromptPanel({ onCodeGenerated }: AIPromptPanelProps) {
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const generateCode = async (prompt: string) => {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/generate-vlsi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      if (result.mainFile && result.testbenchFile) {
        onCodeGenerated(result.mainFile, result.testbenchFile)
      }
    } catch (error) {
      console.error("Error generating code:", error)
      alert(`Error: ${error instanceof Error ? error.message : "Failed to generate code"}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isGenerating) return

    await generateCode(prompt)
    setPrompt("")
  }

  const examplePrompts = [
    "2-bit full adder with carry input and output",
    "4-bit counter with reset and enable",
    "8-bit shift register with parallel load",
    "2-to-1 multiplexer with enable signal",
  ]

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900">VLSI Code Generator</h3>
        </div>
        <p className="text-sm text-gray-600">Describe the digital circuit you want to create</p>
      </div>

      {/* Example Prompts */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Example Prompts:</h4>
        <div className="space-y-1">
          {examplePrompts.map((example, index) => (
            <button
              key={index}
              onClick={() => setPrompt(example)}
              className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt Input */}
      <div className="flex-1 p-4">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your VLSI design requirements..."
            className="flex-1 w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isGenerating}
          />
          <Button type="submit" disabled={!prompt.trim() || isGenerating} className="mt-3 w-full">
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Code...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Generate VLSI Code
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
