export const runtime = "edge";
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
        sql: "SELECT * FROM files WHERE project_id = ? ORDER BY created_at ASC",
        params: [projectId],
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch files from D1")
    }

    const data = await response.json()
    return NextResponse.json(data.result || [])
  } catch (error) {
    console.error("Error fetching files:", error)
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { project_id, user_id, name, content, file_type = "verilog", is_testbench = false } = await request.json()

    if (!project_id || !user_id || !name || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const response = await fetch(`${process.env.CLOUDFLARE_D1_API_URL}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_D1_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql: "INSERT INTO files (id, project_id, user_id, name, content, file_type, is_testbench) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *",
        params: [fileId, project_id, user_id, name, content, file_type, is_testbench],
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to save file to D1")
    }

    const data = await response.json()
    return NextResponse.json(data.result[0])
  } catch (error) {
    console.error("Error saving file:", error)
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 })
  }
}
