"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { d1Client } from "@/lib/d1-client"
import ProjectDashboard from "@/components/project-dashboard"
import TopBar from "@/components/top-bar"
import ChatPanel from "@/components/chat-panel"
import FileTreePanel from "@/components/file-tree-panel"
import ResizeHandle from "@/components/resize-handle"
import LoginForm from "@/components/auth/login-form"
import type { User } from "@supabase/supabase-js"
import { Files,Cpu,Activity } from 'lucide-react'

export interface FileNode {
  id: string
  name: string
  type: "file" | "folder"
  content?: string
  children?: FileNode[]
  isExpanded?: boolean
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export interface EditorTab {
  id: string
  name: string
  content: string
  isDirty: boolean
}

interface Project {
  id: string
  user_id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
  is_favorite?: boolean
}

export default function VLSIDesignStudio() {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [files, setFiles] = useState<FileNode[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [activeFile, setActiveFile] = useState<FileNode | null>(null)
  const [showDashboard, setShowDashboard] = useState(true)
  const [isGeneratingInitial, setIsGeneratingInitial] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<string>("")

  // Panel width states
  const [chatPanelWidth, setChatPanelWidth] = useState(384)
  const [filePanelWidth, setFilePanelWidth] = useState(256)

  const supabase = createClient()

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserProjects(session.user.id)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserProjects(session.user.id)
      } else {
        // Clear data on logout
        setCurrentProject(null)
        setProjects([])
        setFiles([])
        setChatMessages([])
        setActiveFile(null)
        setShowDashboard(true)
      }
    })

    setMounted(true)

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProjects = async (userId: string) => {
    try {
      const userProjects = await d1Client.getUserProjects(userId)
      setProjects(userProjects)

      // Load user preferences
      const preferences = await d1Client.getUserPreferences(userId)
      if (preferences) {
        setChatPanelWidth(preferences.chat_panel_width)
        setFilePanelWidth(preferences.file_panel_width)
      }
    } catch (error) {
      console.error("Error loading user projects:", error)
    }
  }

  const generateProjectName = (prompt: string): string => {
    // Extract meaningful terms from the prompt to create a project name
    const cleanPrompt = prompt
      .toLowerCase()
      .replace(/generate|create|design|build|make|write/gi, "")
      .replace(/verilog|module|code|circuit/gi, "")
      .trim()

    // Look for specific patterns
    const patterns = [
      /(\d+)[-\s]*bit[-\s]*(adder|counter|alu|multiplier|divider|shifter|register)/,
      /(uart|spi|i2c)[-\s]*(transmitter|receiver|controller)/,
      /(full|half)[-\s]*adder/,
      /(mux|multiplexer|demux|demultiplexer)/,
      /(flip[-\s]*flop|latch)/,
      /(encoder|decoder)/,
    ]

    for (const pattern of patterns) {
      const match = cleanPrompt.match(pattern)
      if (match) {
        return match[0]
          .replace(/\s+/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase())
          .replace(/[-\s]+/g, " ")
          .trim()
      }
    }

    // Fallback: use first few meaningful words
    const words = cleanPrompt
      .split(/\s+/)
      .filter((word) => word.length > 2 && !["the", "and", "with", "for", "that"].includes(word))
      .slice(0, 3)

    if (words.length > 0) {
      return words
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
        .trim()
    }

    // Final fallback
    return "VLSI Circuit Design"
  }

  const handleCreateProject = async () => {
    if (!user) return

    try {
      const projectName = `VLSI Project ${projects.length + 1}`
      const newProject = await d1Client.createProject(user.id, projectName, "New VLSI design project")

      setProjects((prev) => [newProject, ...prev])
      setCurrentProject(newProject)
      setShowDashboard(false)

      // Initialize with welcome message
      setChatMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `Welcome to your new VLSI project: ${projectName}!\n\nI'm ready to help you design digital circuits. You can ask me to:\n\n• Generate Verilog modules (counters, adders, ALUs, etc.)\n• Create comprehensive testbenches\n• Debug existing code\n• Optimize designs\n\nWhat would you like to build first?`,
          timestamp: new Date(),
        },
      ])

      setFiles([])
      setActiveFile(null)
    } catch (error) {
      console.error("Error creating project:", error)
    }
  }

  const handleCreateProjectWithPrompt = async (prompt: string) => {
    if (!user) return

    try {
      setIsGeneratingInitial(true)
      setGenerationStatus("Creating project...")

      // Generate a meaningful project name from the prompt
      const projectName = generateProjectName(prompt)
      const newProject = await d1Client.createProject(user.id, projectName, `Generated from: ${prompt}`)

      setProjects((prev) => [newProject, ...prev])
      setCurrentProject(newProject)
      setShowDashboard(false)

      setGenerationStatus("Setting up workspace...")

      // Initialize with the user's prompt as the first message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: prompt,
        timestamp: new Date(),
      }

      setChatMessages([userMessage])
      setFiles([])
      setActiveFile(null)

      // Save the user message to database
      await d1Client.saveChatMessage(newProject.id, user.id, {
        role: userMessage.role,
        content: userMessage.content,
      })

      setGenerationStatus("Generating VLSI code with AI...")

      // Add a loading message to show generation is happening
      const loadingMessage: ChatMessage = {
        id: `loading-${Date.now()}`,
        role: "assistant",
        content:
          "🔄 Generating your VLSI design with vlsigpt...\n\nThis may take a few moments. Please wait while I create your Verilog modules and testbenches.",
        timestamp: new Date(),
      }

      setChatMessages((prev) => [...prev, loadingMessage])

      // Generate VLSI code immediately
      try {
        const result = await d1Client.generateVLSICode(prompt, user.id, newProject.id)

        // Remove loading message
        setChatMessages((prev) => prev.filter((msg) => msg.id !== loadingMessage.id))

        if (result.mainFile && result.testbenchFile) {
          setGenerationStatus("Processing generated files...")

          // Process and save the generated files - THIS IS THE KEY FIX
          const newFiles = await handleCodeGenerated(result.mainFile, result.testbenchFile)

          // Add success message with actual file names
          const aiMessage: ChatMessage = {
            id: `ai-${Date.now()}`,
            role: "assistant",
            content: ` **Project "${projectName}" created successfully!**\n\n**Files Generated:**\n• ${newFiles[0]?.name || result.mainFile.name}\n• ${newFiles[1]?.name || result.testbenchFile.name}\n\nYour VLSI design is ready for simulation and further development. You can now:\n\n• Edit the generated code in the file explorer\n• Run simulations on your testbench\n• Ask me to modify or optimize the design\n• Generate additional modules`,
            timestamp: new Date(),
          }

          setChatMessages((prev) => [...prev, aiMessage])
          await d1Client.saveChatMessage(newProject.id, user.id, {
            role: aiMessage.role,
            content: aiMessage.content,
          })

          setGenerationStatus("Complete!")
          setTimeout(() => setGenerationStatus(""), 2000)
        } else {
          throw new Error("Failed to generate code files")
        }
      } catch (error) {
        console.error("Error generating initial code:", error)

        // Remove loading message
        setChatMessages((prev) => prev.filter((msg) => msg.id !== loadingMessage.id))

        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `❌ **Project "${projectName}" created, but there was an issue generating the initial code.**\n\n**Error:** ${error instanceof Error ? error.message : "Unknown error"}\n\n**What you can do:**\n• Try rephrasing your request\n• Ask me to generate the code again\n• Start with a simpler design\n• Check the example templates for reference`,
          timestamp: new Date(),
        }

        setChatMessages((prev) => [...prev, errorMessage])
        await d1Client.saveChatMessage(newProject.id, user.id, {
          role: errorMessage.role,
          content: errorMessage.content,
        })

        setGenerationStatus("Error occurred")
        setTimeout(() => setGenerationStatus(""), 3000)
      }
    } catch (error) {
      console.error("Error creating project with prompt:", error)
      setGenerationStatus("Failed to create project")
      setTimeout(() => setGenerationStatus(""), 3000)
    } finally {
      setIsGeneratingInitial(false)
    }
  }

  const handleSelectProject = async (project: Project) => {
    if (!user) return

    try {
      setCurrentProject(project)
      setShowDashboard(false)

      // Load project files and chat history
      const [projectFiles, chatHistory] = await Promise.all([
        d1Client.getProjectFiles(project.id),
        d1Client.getProjectChatHistory(project.id),
      ])

      // Convert database files to FileNode format
      const fileNodes: FileNode[] = projectFiles.map((file) => ({
        id: file.id,
        name: file.name,
        type: "file" as const,
        content: file.content,
      }))

      // Convert database messages to ChatMessage format
      const messages: ChatMessage[] = chatHistory.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }))

      setFiles(fileNodes)
      setChatMessages(
        messages.length > 0
          ? messages
          : [
              {
                id: "welcome-back",
                role: "assistant",
                content: `Welcome back to ${project.name}!\n\nI'm ready to continue working on your VLSI designs. What would you like to work on today?`,
                timestamp: new Date(),
              },
            ],
      )

      if (fileNodes.length > 0) {
        setActiveFile(fileNodes[0])
      }
    } catch (error) {
      console.error("Error loading project:", error)
    }
  }

  const handleToggleFavorite = async (projectId: string) => {
    if (!user) return

    try {
      const project = projects.find((p) => p.id === projectId)
      if (!project) return

      const updatedProject = await d1Client.updateProject(projectId, {
        is_favorite: !project.is_favorite,
      })

      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, is_favorite: updatedProject.is_favorite } : p)),
      )

      // Update current project if it's the one being toggled
      if (currentProject?.id === projectId) {
        setCurrentProject({ ...currentProject, is_favorite: updatedProject.is_favorite })
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
    }
  }

  const handleBackToDashboard = () => {
    setShowDashboard(true)
    setCurrentProject(null)
    setFiles([])
    setChatMessages([])
    setActiveFile(null)
    setIsGeneratingInitial(false)
    setGenerationStatus("")
  }

  const handleFileSelect = (file: FileNode) => {
    if (file.type === "file") {
      setActiveFile(file)
    }
  }

  const handleFileUpdate = async (fileId: string, content: string) => {
    if (!user || !currentProject) return

    try {
      // Update local state
      setFiles((prevFiles) => prevFiles.map((file) => (file.id === fileId ? { ...file, content } : file)))

      if (activeFile?.id === fileId) {
        setActiveFile({ ...activeFile, content })
      }

      // Update in database
      await d1Client.updateFile(fileId, { content })
    } catch (error) {
      console.error("Error updating file:", error)
    }
  }

  const handleSendMessage = async (message: ChatMessage) => {
    if (!user || !currentProject) return

    try {
      // Update local state
      setChatMessages((prev) => [...prev, message])

      // Save to database
      await d1Client.saveChatMessage(currentProject.id, user.id, {
        role: message.role,
        content: message.content,
      })
    } catch (error) {
      console.error("Error saving chat message:", error)
    }
  }

  const generateUniqueFileName = (baseName: string, isTestbench = false): string => {
    const extension = ".v"
    const suffix = isTestbench ? "-testbench" : ""
    let fileName = `${baseName}${suffix}${extension}`

    let counter = 1
    while (files.some((file) => file.name === fileName)) {
      fileName = `${baseName}-${counter}${suffix}${extension}`
      counter++
    }

    return fileName
  }

  const processVerilogContent = (content: string): string => {
    if (!content) return ""

    // Handle various newline escape patterns
    let processed = content
      .replace(/\\n/g, "\n") // Convert \n to actual newlines
      .replace(/\\r\\n/g, "\n") // Convert \r\n to newlines
      .replace(/\\r/g, "\n") // Convert \r to newlines
      .replace(/\\t/g, "    ") // Convert \t to 4 spaces
      .replace(/\\\\/g, "\\") // Unescape backslashes

    // Clean up any HTML entities that might have slipped through
    processed = processed
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")

    // Normalize line endings and clean up extra whitespace
    processed = processed
      .replace(/\r\n/g, "\n") // Normalize Windows line endings
      .replace(/\r/g, "\n") // Normalize old Mac line endings
      .replace(/\n\s*\n\s*\n/g, "\n\n") // Remove excessive blank lines
      .trim()

    return processed
  }

  // FIXED: Return the created files so they can be used in the success message
  const handleCodeGenerated = async (mainFile: any, testbenchFile: any): Promise<FileNode[]> => {
    if (!user || !currentProject) return []

    try {
      const baseName = mainFile.name.replace(/\.v$/, "").replace(/-testbench$/, "")
      const uniqueMainName = generateUniqueFileName(baseName, false)
      const uniqueTestbenchName = generateUniqueFileName(baseName, true)

      // Process content to ensure proper newlines
      const processedMainContent = processVerilogContent(mainFile.content)
      const processedTestbenchContent = processVerilogContent(testbenchFile.content)

      console.log("Saving files to database...")

      // Save files to database
      const [savedMainFile, savedTestbenchFile] = await Promise.all([
        d1Client.saveFile(currentProject.id, user.id, {
          name: uniqueMainName,
          content: processedMainContent,
          file_type: "verilog",
          is_testbench: false,
        }),
        d1Client.saveFile(currentProject.id, user.id, {
          name: uniqueTestbenchName,
          content: processedTestbenchContent,
          file_type: "verilog",
          is_testbench: true,
        }),
      ])

      console.log("Files saved successfully:", savedMainFile, savedTestbenchFile)

      // Create new file nodes with processed content
      const newFiles: FileNode[] = [
        {
          id: savedMainFile.id,
          name: savedMainFile.name,
          type: "file" as const,
          content: processedMainContent,
        },
        {
          id: savedTestbenchFile.id,
          name: savedTestbenchFile.name,
          type: "file" as const,
          content: processedTestbenchContent,
        },
      ]

      console.log("Updating local file state...")

      // CRITICAL FIX: Update local state immediately
      setFiles((prevFiles) => {
        const updatedFiles = [...prevFiles, ...newFiles]
        console.log("Updated files state:", updatedFiles)
        return updatedFiles
      })

      // Set the first file as active
      setActiveFile(newFiles[0])

      console.log("Files state updated successfully")

      return newFiles
    } catch (error) {
      console.error("Error saving generated code:", error)
      return []
    }
  }

  const handleChatPanelResize = async (newWidth: number) => {
    const constrainedWidth = Math.max(280, Math.min(600, newWidth))
    setChatPanelWidth(constrainedWidth)

    // Save preference to database
    if (user) {
      try {
        await d1Client.saveUserPreferences({
          user_id: user.id,
          chat_panel_width: constrainedWidth,
          file_panel_width: filePanelWidth,
          theme: "light",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      } catch (error) {
        console.error("Error saving preferences:", error)
      }
    }
  }

  const handleFilePanelResize = async (newWidth: number) => {
    const constrainedWidth = Math.max(200, Math.min(400, newWidth))
    setFilePanelWidth(constrainedWidth)

    // Save preference to database
    if (user) {
      try {
        await d1Client.saveUserPreferences({
          user_id: user.id,
          chat_panel_width: chatPanelWidth,
          file_panel_width: constrainedWidth,
          theme: "light",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      } catch (error) {
        console.error("Error saving preferences:", error)
      }
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading VLSI Design Studio...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  // Show dashboard if no project is selected
  if (showDashboard || !currentProject) {
    return (
      <ProjectDashboard
        user={user}
        projects={projects}
        onCreateProject={handleCreateProject}
        onSelectProject={handleSelectProject}
        onCreateProjectWithPrompt={handleCreateProjectWithPrompt}
        onToggleFavorite={handleToggleFavorite}
        onSignOut={handleSignOut}
      />
    )
  }

  // Show main VLSI design studio
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <TopBar
        user={user}
        onSignOut={handleSignOut}
        currentProject={currentProject}
        onBackToDashboard={handleBackToDashboard}
        projects={projects}
        onSelectProject={handleSelectProject}
        onToggleFavorite={handleToggleFavorite}
        isGenerating={isGeneratingInitial}
        generationStatus={generationStatus}
      />
      <div className="flex-1 flex overflow-hidden min-h-0">
        <div
          className="border-r border-gray-200 bg-white flex flex-col min-h-0"
          style={{ width: `${chatPanelWidth}px` }}
        >
          <ChatPanel
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            onCodeGenerated={handleCodeGenerated}
            user={user}
            currentProject={currentProject}
            isGeneratingInitial={isGeneratingInitial}
          />
        </div>

        <ResizeHandle direction="horizontal" onResize={(delta) => handleChatPanelResize(chatPanelWidth + delta)} />

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex min-h-0">
            <div
              className="border-r border-gray-200 bg-gray-50 flex flex-col min-h-0"
              style={{ width: `${filePanelWidth}px` }}
            >
              <div className="p-3 border-b border-gray-200 flex-shrink-0 ">
                <div className="flex flex-row justify-between">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                   <Files className="w-4 h-4 " />
                  Hardware Files
                  {isGeneratingInitial && (
                    <div className="flex items-center gap-1 ">
                      <span className="text-xs">Generating...</span>
                    </div>
                  )}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{files.length} files</p>
                </div>
                
              </div>

              <div className="flex-1 overflow-y-auto p-1.5 min-h-0">
                {files.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <div className="w-8 h-8 mx-auto mb-2 text-gray-300">
                      {isGeneratingInitial ? (
                        <img className="w-2 h-2" src="/loading.gif" alt="loading icon" />
                      ) : (
                        "📄"
                      )}
                    </div>
                    <p className="text-sm">{isGeneratingInitial ? "Generating files..." : "No files yet"}</p>
                    <p className="text-xs">
                      {isGeneratingInitial
                        ? "Please wait while AI creates your code"
                        : "Generate some code to get started!"}
                    </p>
                  </div>
                ) : (
                  <ul className="flex list-none flex-col w-full">
                    {files.map((file) => (
                      <li key={file.id}>
                        <button
                          className={`mb-0 h-[26px] flex  items-center w-full min-w-36 justify-start gap-2 pl-0.5 pr-1 rounded-lg text-left hover:bg-gray-200 ${
                            activeFile?.id === file.id ? "bg-gray-200" : ""
                          }`}
                          onClick={() => handleFileSelect(file)}
                        >
                          <div className="flex min-w-0 items-center gap-1 px-2 py-1">
                            <div className="p-0.5 text-black ">
                              <span className="text-sm items-center">{file.name.includes("testbench") ? <Activity className="w-3 h-3"/> : <Cpu className="w-3 h-3" />}</span>
                            </div>
                            <span className="truncate font-normal text-sm">{file.name}</span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {activeFile && (
                <div className="p-3 border-t border-gray-200 bg-white flex-shrink-0">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Lines:</span>
                      <span className="font-medium">{activeFile.content?.split("\n").length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Characters:</span>
                      <span className="font-medium">{activeFile.content?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Modules:</span>
                      <span className="font-medium">{(activeFile.content?.match(/module\s+\w+/g) || []).length}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <ResizeHandle direction="horizontal" onResize={(delta) => handleFilePanelResize(filePanelWidth + delta)} />

            <div className="flex-1 flex flex-col min-h-0">
              <FileTreePanel
                files={files}
                onFileSelect={handleFileSelect}
                activeFile={activeFile}
                onFileUpdate={handleFileUpdate}
                showFileTree={false}
                isGenerating={isGeneratingInitial}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
