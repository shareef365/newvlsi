// Updated D1 client with your actual worker URL

export interface Project {
  id: string
  user_id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
  is_favorite?: boolean
}

export interface FileRecord {
  id: string
  project_id: string
  user_id: string
  name: string
  content: string
  file_type: string
  is_testbench: boolean
  created_at: string
  updated_at: string
}

export interface ChatMessageRecord {
  id: string
  project_id: string
  user_id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

export interface UserPreferences {
  user_id: string
  chat_panel_width: number
  file_panel_width: number
  theme: string
  created_at: string
  updated_at: string
}

export class D1Client {
  private baseUrl: string

  constructor(baseUrl = "https://pagevlsi.arshadahmedshareef101.workers.dev") {
    this.baseUrl = baseUrl
  }

  // Helper function to process content
  private processContent(content: string): string {
    if (!content) return ""

    // Ensure proper newlines for display
    return content.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t")
  }

  // Project operations
  async createProject(userId: string, name: string, description?: string): Promise<Project> {
    const response = await fetch(`${this.baseUrl}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, name, description }),
    })
    if (!response.ok) throw new Error("Failed to create project")
    return response.json()
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    const response = await fetch(`${this.baseUrl}/api/projects?user_id=${userId}`)
    if (!response.ok) throw new Error("Failed to fetch projects")
    return response.json()
  }

  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    const response = await fetch(`${this.baseUrl}/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error("Failed to update project")
    return response.json()
  }

  async deleteProject(projectId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/projects/${projectId}`, {
      method: "DELETE",
    })
    if (!response.ok) throw new Error("Failed to delete project")
  }

  // File operations - UPDATED with content processing
  async saveFile(
    projectId: string,
    userId: string,
    file: Omit<FileRecord, "id" | "created_at" | "updated_at">,
  ): Promise<FileRecord> {
    const response = await fetch(`${this.baseUrl}/api/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...file, project_id: projectId, user_id: userId }),
    })
    if (!response.ok) throw new Error("Failed to save file")
    const result = await response.json()

    // Process content for proper display
    if (result.content) {
      result.content = this.processContent(result.content)
    }

    return result
  }

  async getProjectFiles(projectId: string): Promise<FileRecord[]> {
    const response = await fetch(`${this.baseUrl}/api/files?project_id=${projectId}`)
    if (!response.ok) throw new Error("Failed to fetch files")
    const files = await response.json()

    // Process content for all files
    return files.map((file: FileRecord) => ({
      ...file,
      content: this.processContent(file.content),
    }))
  }

  async updateFile(fileId: string, updates: Partial<FileRecord>): Promise<FileRecord> {
    const response = await fetch(`${this.baseUrl}/api/files/${fileId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error("Failed to update file")
    const result = await response.json()

    // Process content for proper display
    if (result.content) {
      result.content = this.processContent(result.content)
    }

    return result
  }

  async deleteFile(fileId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/files/${fileId}`, {
      method: "DELETE",
    })
    if (!response.ok) throw new Error("Failed to delete file")
  }

  // Chat message operations
  async saveChatMessage(
    projectId: string,
    userId: string,
    message: Omit<ChatMessageRecord, "id" | "created_at">,
  ): Promise<ChatMessageRecord> {
    const response = await fetch(`${this.baseUrl}/api/chat-messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...message, project_id: projectId, user_id: userId }),
    })
    if (!response.ok) throw new Error("Failed to save chat message")
    return response.json()
  }

  async getProjectChatHistory(projectId: string): Promise<ChatMessageRecord[]> {
    const response = await fetch(`${this.baseUrl}/api/chat-messages?project_id=${projectId}`)
    if (!response.ok) throw new Error("Failed to fetch chat history")
    return response.json()
  }

  // User preferences
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const response = await fetch(`${this.baseUrl}/api/preferences?user_id=${userId}`)
    if (response.status === 404) return null
    if (!response.ok) throw new Error("Failed to fetch user preferences")
    return response.json()
  }

  async saveUserPreferences(preferences: UserPreferences): Promise<UserPreferences> {
    const response = await fetch(`${this.baseUrl}/api/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preferences),
    })
    if (!response.ok) throw new Error("Failed to save user preferences")
    return response.json()
  }

  // VLSI Code Generation
  async generateVLSICode(prompt: string, userId?: string, projectId?: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/generate-vlsi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, userId, projectId }),
    })
    if (!response.ok) throw new Error("Failed to generate VLSI code")
    return response.json()
  }
}

export const d1Client = new D1Client()
