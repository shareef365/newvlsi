"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Clock,
  Folder,
  Zap,
  Upload,
  FileText,
  Cpu,
  Settings,
  User,
  Loader2,
  Star,
  StarOff,
} from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface Project {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
  file_count?: number
  is_favorite?: boolean
}

interface ProjectDashboardProps {
  user: SupabaseUser
  projects: Project[]
  onCreateProject: () => void
  onSelectProject: (project: Project) => void
  onCreateProjectWithPrompt: (prompt: string) => void
  onToggleFavorite: (projectId: string) => void
  onSignOut: () => void
}

export default function ProjectDashboard({
  user,
  projects,
  onCreateProject,
  onSelectProject,
  onCreateProjectWithPrompt,
  onToggleFavorite,
  onSignOut,
}: ProjectDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showFavorites, setShowFavorites] = useState(true)
  const [showRecents, setShowRecents] = useState(true)
  const [selectedModel, setSelectedModel] = useState("Qwen2.5-Coder-32B")
  const [promptInput, setPromptInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  // Filter projects based on search
  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Sort projects by last updated
  const recentProjects = [...filteredProjects]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10)

  // Get favorite projects
  const favoriteProjects = filteredProjects.filter((project) => project.is_favorite)

  const starterTemplates = [
    {
      title: "Basic Counter",
      description: "4-bit counter with reset",
      icon: "🔢",
      prompt: "Generate a 4-bit counter with synchronous reset and enable signal",
    },
    {
      title: "ALU Design",
      description: "8-bit arithmetic logic unit",
      icon: "🧮",
      prompt: "Create an 8-bit ALU with addition, subtraction, AND, OR operations",
    },
    {
      title: "Memory Module",
      description: "Simple RAM implementation",
      icon: "💾",
      prompt: "Design a 16x8 RAM module with read/write enable signals",
    },
    {
      title: "UART Controller",
      description: "Serial communication interface",
      icon: "📡",
      prompt: "Generate a UART transmitter and receiver with configurable baud rate",
    },
  ]

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return "Today"
    if (diffDays === 2) return "Yesterday"
    if (diffDays <= 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const handleGenerateClick = async () => {
    if (!promptInput.trim() || isGenerating) return

    setIsGenerating(true)
    try {
      await onCreateProjectWithPrompt(promptInput.trim())
      setPromptInput("")
    } catch (error) {
      console.error("Error generating project:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleTemplateClick = async (template: any) => {
    setIsGenerating(true)
    try {
      await onCreateProjectWithPrompt(template.prompt)
    } catch (error) {
      console.error("Error generating from template:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isGenerating) {
      e.preventDefault()
      handleGenerateClick()
    }
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">VLSI Studio</div>
              <div className="text-xs text-gray-500">Personal • Free</div>
            </div>
          </div>

          <Button onClick={onCreateProject} className="w-full justify-start gap-2 bg-gray-900 hover:bg-gray-800">
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Navigation Items */}
            <nav className="space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                <Folder className="w-4 h-4" />
                Projects ({projects.length})
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                <Clock className="w-4 h-4" />
                Recents
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                <Cpu className="w-4 h-4" />
                Templates
              </button>
            </nav>

            {/* Favorite Projects */}
            <div className="mt-6">
              <button
                onClick={() => setShowFavorites(!showFavorites)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                <span>Favorite Projects ({favoriteProjects.length})</span>
                {showFavorites ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {showFavorites && (
                <div className="mt-1 space-y-1">
                  {favoriteProjects.length === 0 ? (
                    <div className="px-6 py-2 text-xs text-gray-500">No favorite projects yet</div>
                  ) : (
                    favoriteProjects.slice(0, 5).map((project) => (
                      <div key={project.id} className="flex items-center group">
                        <button
                          onClick={() => onSelectProject(project)}
                          className="flex-1 text-left px-6 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg truncate"
                          disabled={isGenerating}
                        >
                          {project.name}
                        </button>
                        <button
                          onClick={() => onToggleFavorite(project.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-yellow-500 hover:text-yellow-600 transition-opacity"
                          disabled={isGenerating}
                        >
                          <Star className="w-3 h-3 fill-current" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Recent Projects */}
            <div className="mt-4">
              <button
                onClick={() => setShowRecents(!showRecents)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                <span>Recents</span>
                {showRecents ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {showRecents && (
                <div className="mt-1 space-y-1 max-h-64 overflow-y-auto">
                  {recentProjects.map((project) => (
                    <div key={project.id} className="flex items-center group">
                      <button
                        onClick={() => onSelectProject(project)}
                        className="flex-1 text-left px-6 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                        disabled={isGenerating}
                      >
                        <div className="truncate">{project.name}</div>
                        <div className="text-xs text-gray-400 truncate">{formatDate(project.updated_at)}</div>
                      </button>
                      <button
                        onClick={() => onToggleFavorite(project.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-yellow-500 transition-all"
                        disabled={isGenerating}
                      >
                        {project.is_favorite ? (
                          <Star className="w-3 h-3 fill-current text-yellow-500" />
                        ) : (
                          <StarOff className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User Menu */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{user.email}</div>
              <div className="text-xs text-gray-500">Personal Account</div>
            </div>
            <Button variant="ghost" size="sm" onClick={onSignOut} className="p-1">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">New</div>
            <span className="text-sm text-gray-700">VLSI Design Studio is now powered by Qwen2.5-Coder-32B.</span>
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">Learn More →</button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full">
            {/* Main Heading */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">What VLSI circuit can I help you build?</h1>
              <p className="text-lg text-gray-600">
                Describe your digital circuit requirements and I'll generate Verilog code with testbenches.
              </p>
            </div>

            {/* Input Area */}
            <div className="mb-8">
              <div className="relative">
                <textarea
                  placeholder="Describe your VLSI design requirements... (e.g., '4-bit counter with reset')"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isGenerating}
                  className="w-full p-4 pr-32 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  rows={3}
                />
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={isGenerating}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  >
                    <option value="Qwen2.5-Coder-32B">Qwen2.5-Coder-32B</option>
                  </select>
                  <Button
                    size="sm"
                    onClick={handleGenerateClick}
                    disabled={!promptInput.trim() || isGenerating}
                    className="bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate"
                    )}
                  </Button>
                </div>
              </div>
              {isGenerating && (
                <div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  Creating project and generating VLSI code...
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-gray-50"
                disabled={isGenerating}
              >
                <Upload className="w-5 h-5 text-gray-600" />
                <span className="text-sm">Upload Verilog</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-gray-50"
                disabled={isGenerating}
              >
                <FileText className="w-5 h-5 text-gray-600" />
                <span className="text-sm">Import Design</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-gray-50"
                disabled={isGenerating}
              >
                <Cpu className="w-5 h-5 text-gray-600" />
                <span className="text-sm">Simulate</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-gray-50"
                disabled={isGenerating}
              >
                <Zap className="w-5 h-5 text-gray-600" />
                <span className="text-sm">Synthesize</span>
              </Button>
            </div>

            {/* Starter Templates */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Starter Templates</h2>
              <p className="text-gray-600 mb-6">Get started instantly with a common VLSI design pattern.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {starterTemplates.map((template, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto p-6 flex items-start gap-4 hover:bg-gray-50 text-left"
                    onClick={() => handleTemplateClick(template)}
                    disabled={isGenerating}
                  >
                    <div className="text-2xl">{template.icon}</div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 mb-1">{template.title}</div>
                      <div className="text-sm text-gray-600">{template.description}</div>
                    </div>
                    {isGenerating && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
