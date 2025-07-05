export const runtime = "edge";
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const response = await fetch(`${process.env.CLOUDFLARE_D1_API_URL}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_D1_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql: "SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC",
        params: [userId],
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch projects from D1")
    }

    const data = await response.json()
    return NextResponse.json(data.result || [])
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user_id, name, description } = await request.json()

    if (!user_id || !name) {
      return NextResponse.json({ error: "User ID and name are required" }, { status: 400 })
    }

    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const response = await fetch(`${process.env.CLOUDFLARE_D1_API_URL}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_D1_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql: "INSERT INTO projects (id, user_id, name, description) VALUES (?, ?, ?, ?) RETURNING *",
        params: [projectId, user_id, name, description || null],
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to create project in D1")
    }

    const data = await response.json()
    return NextResponse.json(data.result[0])
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}
