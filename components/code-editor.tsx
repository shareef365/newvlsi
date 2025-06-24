"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import type { EditorTab } from "@/app/page"

interface CodeEditorProps {
  tabs: EditorTab[]
  activeTabId: string
  onTabSelect: (tabId: string) => void
  onTabClose: (tabId: string) => void
  onContentChange: (tabId: string, content: string) => void
}

export default function CodeEditor({ tabs, activeTabId, onTabSelect, onTabClose, onContentChange }: CodeEditorProps) {
  const activeTab = tabs.find((tab) => tab.id === activeTabId)

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (activeTab) {
      onContentChange(activeTab.id, e.target.value)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tab Bar */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center px-3 py-2 border-r border-gray-200 cursor-pointer ${
              tab.id === activeTabId ? "bg-white border-b-2 border-blue-500" : "hover:bg-gray-100"
            }`}
            onClick={() => onTabSelect(tab.id)}
          >
            <span className="text-sm mr-2">
              {tab.name}
              {tab.isDirty && <span className="text-orange-500 ml-1">●</span>}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="w-4 h-4 p-0 hover:bg-gray-200"
              onClick={(e) => {
                e.stopPropagation()
                onTabClose(tab.id)
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Editor Content */}
      <div className="flex-1 flex">
        {/* Line Numbers */}
        <div className="w-12 bg-gray-50 border-r border-gray-200 p-2 text-right text-sm text-gray-500 font-mono">
          {activeTab &&
            activeTab.content.split("\n").map((_, index) => (
              <div key={`line-${index}`} className="leading-6">
                {index + 1}
              </div>
            ))}
        </div>

        {/* Code Area */}
        <div className="flex-1">
          {activeTab ? (
            <textarea
              value={activeTab.content}
              onChange={handleContentChange}
              className="w-full h-full p-4 font-mono text-sm resize-none border-none outline-none bg-white"
              style={{ lineHeight: "1.5" }}
              spellCheck={false}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>No file selected</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-gray-50 border-t border-gray-200 flex items-center justify-between px-4 text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          {activeTab && (
            <>
              <span>Lines: {activeTab.content.split("\n").length}</span>
              <span>Characters: {activeTab.content.length}</span>
            </>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span>UTF-8</span>
          <span>LF</span>
        </div>
      </div>
    </div>
  )
}
