export const runtime = "edge";
import { type NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { name, description, is_favorite } = await request.json()
    const projectId = params.id

    // Build dynamic parts
    const fields: string[] = []
    const queryParams: (string | boolean)[] = []
    if (name !== undefined) {
      fields.push("name = ?")
      queryParams.push(name)
    }
    if (description !== undefined) {
      fields.push("description = ?")
      queryParams.push(description)
    }
    if (is_favorite !== undefined) {
      fields.push("is_favorite = ?")
      queryParams.push(is_favorite ? 1 : 0)
    }
    queryParams.push(projectId)

    const response = await fetch(`${process.env.CLOUDFLARE_D1_API_URL}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_D1_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql: `UPDATE projects SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *`,
        params: queryParams,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to update project in D1")
    }

    const data = await response.json()
    return NextResponse.json(data.result[0])
  } catch (error) {
    console.error("Error updating project:", error)
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const projectId = params.id

    const response = await fetch(`${process.env.CLOUDFLARE_D1_API_URL}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_D1_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql: "DELETE FROM projects WHERE id = ?",
        params: [projectId],
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to delete project from D1")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting project:", error)
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 })
  }
}
