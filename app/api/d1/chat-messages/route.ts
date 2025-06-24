import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("project_id")

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
    }

    const response = await fetch(`${process.env.CLOUDFLARE_D1_API_URL}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_D1_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql: "SELECT * FROM chat_messages WHERE project_id = ? ORDER BY created_at ASC",
        params: [projectId],
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch chat messages from D1")
    }

    const data = await response.json()
    return NextResponse.json(data.result || [])
  } catch (error) {
    console.error("Error fetching chat messages:", error)
    return NextResponse.json({ error: "Failed to fetch chat messages" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { project_id, user_id, role, content } = await request.json()

    if (!project_id || !user_id || !role || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const response = await fetch(`${process.env.CLOUDFLARE_D1_API_URL}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_D1_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql: "INSERT INTO chat_messages (id, project_id, user_id, role, content) VALUES (?, ?, ?, ?, ?) RETURNING *",
        params: [messageId, project_id, user_id, role, content],
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to save chat message to D1")
    }

    const data = await response.json()
    return NextResponse.json(data.result[0])
  } catch (error) {
    console.error("Error saving chat message:", error)
    return NextResponse.json({ error: "Failed to save chat message" }, { status: 500 })
  }
}
