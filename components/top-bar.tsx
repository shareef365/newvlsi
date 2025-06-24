"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Play,
  Settings,
  Download,
  Share,
  LogOut,
  ArrowLeft,
  Menu,
  Star,
  StarOff,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface Project {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
  is_favorite?: boolean
}

interface TopBarProps {
  user?: SupabaseUser | null
  onSignOut?: () => void
  currentProject?: Project
  onBackToDashboard?: () => void
  projects?: Project[]
  onSelectProject?: (project: Project) => void
  onToggleFavorite?: (projectId: string) => void
  isGenerating?: boolean
  generationStatus?: string
}

export default function TopBar({
  user,
  onSignOut,
  currentProject,
  onBackToDashboard,
  projects = [],
  onSelectProject,
  onToggleFavorite,
  isGenerating = false,
  generationStatus = "",
}: TopBarProps) {
  const [showProjectSidebar, setShowProjectSidebar] = useState(false)

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

  const getStatusIcon = () => {
    if (isGenerating) {
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
    }
    if (generationStatus === "Complete!") {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    }
    if (generationStatus.includes("Error") || generationStatus.includes("Failed")) {
      return <AlertCircle className="w-4 h-4 text-red-500" />
    }
    return null
  }

  return (
    <>
      <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 relative">
        <div className="flex items-center space-x-4">
          {currentProject && onBackToDashboard && (
            <Button variant="ghost" size="sm" onClick={onBackToDashboard} disabled={isGenerating}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Dashboard
            </Button>
          )}

          {/* Project Selector */}
          {currentProject && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProjectSidebar(!showProjectSidebar)}
                className="flex items-center gap-2"
              >
                <Menu className="w-4 h-4" />
                <span className="font-semibold text-gray-900">{currentProject.name}</span>
              </Button>

              {/* Favorite Toggle */}
              {onToggleFavorite && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleFavorite(currentProject.id)}
                  className="p-1"
                  disabled={isGenerating}
                >
                  {currentProject.is_favorite ? (
                    <Star className="w-4 h-4 fill-current text-yellow-500" />
                  ) : (
                    <StarOff className="w-4 h-4 text-gray-400 hover:text-yellow-500" />
                  )}
                </Button>
              )}
            </div>
          )}

          {!currentProject && user && <span className="text-sm text-gray-500">Welcome, {user.email}</span>}

          {/* Generation Status */}
          {(isGenerating || generationStatus) && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
              {getStatusIcon()}
              <span className="text-sm text-blue-700">{generationStatus || "Generating..."}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {currentProject && (
            <>
              <Button variant="ghost" size="sm" disabled={isGenerating}>
                <Play className="w-4 h-4 mr-1" />
                Simulate
              </Button>
              <Button variant="ghost" size="sm" disabled={isGenerating}>
                Synthesize
              </Button>
              <div className="w-px h-6 bg-gray-300"></div>
              <Button variant="ghost" size="sm" disabled={isGenerating}>
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" disabled={isGenerating}>
                <Share className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>

          {user && onSignOut && (
            <>
              <div className="w-px h-6 bg-gray-300"></div>
              <Button variant="ghost" size="sm" onClick={onSignOut}>
                <LogOut className="w-4 h-4 mr-1" />
                Sign Out
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Project Sidebar Overlay */}
      {showProjectSidebar && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-25 z-40" onClick={() => setShowProjectSidebar(false)} />
          <div className="fixed top-12 left-0 w-80 h-[calc(100vh-3rem)] bg-white border-r border-gray-200 z-50 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">All Projects</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowProjectSidebar(false)}>
                  ×
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-1">{projects.length} projects</p>
            </div>

            {/* Projects List */}
            <div className="flex-1 overflow-y-auto">
              {projects.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p className="text-sm">No projects yet</p>
                  <p className="text-xs mt-1">Create your first project to get started</p>
                </div>
              ) : (
                <div className="p-2">
                  {projects
                    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                    .map((project) => (
                      <div
                        key={project.id}
                        className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer group ${
                          currentProject?.id === project.id ? "bg-blue-50 border border-blue-200" : ""
                        }`}
                        onClick={() => {
                          if (onSelectProject && project.id !== currentProject?.id) {
                            onSelectProject(project)
                            setShowProjectSidebar(false)
                          }
                        }}
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 text-sm font-medium">
                            {project.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{project.name}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {project.description || "No description"}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{formatDate(project.updated_at)}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          {currentProject?.id === project.id && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onToggleFavorite?.(project.id)
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 transition-opacity"
                            disabled={isGenerating}
                          >
                            {project.is_favorite ? (
                              <Star className="w-3 h-3 fill-current text-yellow-500" />
                            ) : (
                              <StarOff className="w-3 h-3 text-gray-400" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  onBackToDashboard?.()
                  setShowProjectSidebar(false)
                }}
                disabled={isGenerating}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
