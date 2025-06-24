// Updated Cloudflare Worker with proper newline handling
// Replace your existing worker code with this

export default {
  async fetch(request, env, ctx) {
    // Handle CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      })
    }

    const url = new URL(request.url)
    const path = url.pathname

    try {
      // Route requests
      if (path === "/generate-vlsi" && request.method === "POST") {
        return await handleVLSIGeneration(request, env)
      } else if (path.startsWith("/api/")) {
        return await handleDatabaseOperation(request, env, path)
      } else {
        return new Response("Not Found", { status: 404 })
      }
    } catch (error) {
      console.error("Worker error:", error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      })
    }
  },
}

// VLSI Code Generation Handler
async function handleVLSIGeneration(request, env) {
  try {
    const { prompt, userId, projectId } = await request.json()

    if (!prompt) {
      return jsonResponse({ error: "No prompt provided" }, 400)
    }

    console.log("Generating VLSI code for prompt:", prompt)

    // Generate code using AI
    const aiResponse = await env.AI.run("@cf/qwen/qwen2.5-coder-32b-instruct", {
      messages: [
        {
          role: "system",
          content: `You are a VLSI design expert. Generate Verilog code based on user requirements.

IMPORTANT: Always respond with valid JSON in this exact format:
{
  "mainFile": {
    "name": "descriptive-name.v",
    "content": "// Verilog module code here"
  },
  "testbenchFile": {
    "name": "descriptive-name-testbench.v", 
    "content": "// Testbench code here"
  }
}

Rules:
- Use kebab-case for file names (e.g., "full-adder.v", "counter-4bit.v")
- Include comprehensive testbenches
- Add proper comments and documentation
- Follow Verilog best practices
- Make code synthesizable and simulation-ready
- Use proper indentation and formatting`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    console.log("AI Response:", aiResponse)

    let parsedResult
    try {
      // Try to parse the AI response
      const responseText = aiResponse.response || JSON.stringify(aiResponse)
      parsedResult = parseAIResponse(responseText, prompt)
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError)
      return jsonResponse({
        error: "AI response parsing failed",
        rawResponse: aiResponse.response || JSON.stringify(aiResponse),
      })
    }

    if (!parsedResult) {
      return jsonResponse({
        error: "Could not generate valid Verilog code",
        rawResponse: aiResponse.response || JSON.stringify(aiResponse),
      })
    }

    // Save to database if user is authenticated
    if (userId && projectId && env.DB) {
      try {
        await saveGeneratedFiles(env.DB, userId, projectId, parsedResult)
      } catch (dbError) {
        console.error("Database save error:", dbError)
        // Continue anyway, return the generated code
      }
    }

    return jsonResponse(parsedResult)
  } catch (error) {
    console.error("VLSI generation error:", error)
    return jsonResponse({ error: error.message }, 500)
  }
}

// Database Operations Handler
async function handleDatabaseOperation(request, env, path) {
  if (!env.DB) {
    return jsonResponse({ error: "Database not configured" }, 500)
  }

  const method = request.method
  const pathParts = path.split("/").filter((p) => p)

  // Remove 'api' from path parts
  pathParts.shift()

  if (pathParts[0] === "projects") {
    return await handleProjectsAPI(request, env.DB, method, pathParts)
  } else if (pathParts[0] === "files") {
    return await handleFilesAPI(request, env.DB, method, pathParts)
  } else if (pathParts[0] === "chat-messages") {
    return await handleChatAPI(request, env.DB, method, pathParts)
  } else if (pathParts[0] === "preferences") {
    return await handlePreferencesAPI(request, env.DB, method, pathParts)
  }

  return jsonResponse({ error: "Invalid API endpoint" }, 404)
}

// Projects API
async function handleProjectsAPI(request, db, method, pathParts) {
  if (method === "GET") {
    const url = new URL(request.url)
    const userId = url.searchParams.get("user_id")

    if (!userId) {
      return jsonResponse({ error: "User ID required" }, 400)
    }

    const { results } = await db
      .prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC")
      .bind(userId)
      .all()

    return jsonResponse(results || [])
  }

  if (method === "POST") {
    const { user_id, name, description } = await request.json()

    if (!user_id || !name) {
      return jsonResponse({ error: "User ID and name required" }, 400)
    }

    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const { results } = await db
      .prepare("INSERT INTO projects (id, user_id, name, description) VALUES (?, ?, ?, ?) RETURNING *")
      .bind(projectId, user_id, name, description || null)
      .all()

    return jsonResponse(results[0])
  }

  if (method === "PUT" && pathParts[1]) {
    const projectId = pathParts[1]
    const { name, description } = await request.json()

    const { results } = await db
      .prepare("UPDATE projects SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *")
      .bind(name, description, projectId)
      .all()

    return jsonResponse(results[0])
  }

  if (method === "DELETE" && pathParts[1]) {
    const projectId = pathParts[1]

    await db.prepare("DELETE FROM projects WHERE id = ?").bind(projectId).run()

    return jsonResponse({ success: true })
  }

  return jsonResponse({ error: "Invalid request" }, 400)
}

// Files API - UPDATED with proper content handling
async function handleFilesAPI(request, db, method, pathParts) {
  if (method === "GET") {
    const url = new URL(request.url)
    const projectId = url.searchParams.get("project_id")

    if (!projectId) {
      return jsonResponse({ error: "Project ID required" }, 400)
    }

    const { results } = await db
      .prepare("SELECT * FROM files WHERE project_id = ? ORDER BY created_at ASC")
      .bind(projectId)
      .all()

    // Process results to ensure proper newlines
    const processedResults = (results || []).map((file) => ({
      ...file,
      content: unescapeContent(file.content),
    }))

    return jsonResponse(processedResults)
  }

  if (method === "POST") {
    const { project_id, user_id, name, content, file_type = "verilog", is_testbench = false } = await request.json()

    if (!project_id || !user_id || !name || !content) {
      return jsonResponse({ error: "Missing required fields" }, 400)
    }

    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Ensure content is properly formatted
    const processedContent = normalizeContent(content)

    const { results } = await db
      .prepare(
        "INSERT INTO files (id, project_id, user_id, name, content, file_type, is_testbench) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *",
      )
      .bind(fileId, project_id, user_id, name, processedContent, file_type, is_testbench ? 1 : 0)
      .all()

    // Return with unescaped content
    const result = results[0]
    result.content = unescapeContent(result.content)

    return jsonResponse(result)
  }

  if (method === "PUT" && pathParts[1]) {
    const fileId = pathParts[1]
    const { content, name } = await request.json()

    // Ensure content is properly formatted
    const processedContent = content ? normalizeContent(content) : undefined

    const { results } = await db
      .prepare(
        "UPDATE files SET content = COALESCE(?, content), name = COALESCE(?, name), updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *",
      )
      .bind(processedContent, name, fileId)
      .all()

    // Return with unescaped content
    const result = results[0]
    result.content = unescapeContent(result.content)

    return jsonResponse(result)
  }

  if (method === "DELETE" && pathParts[1]) {
    const fileId = pathParts[1]

    await db.prepare("DELETE FROM files WHERE id = ?").bind(fileId).run()

    return jsonResponse({ success: true })
  }

  return jsonResponse({ error: "Invalid request" }, 400)
}

// Chat Messages API
async function handleChatAPI(request, db, method, pathParts) {
  if (method === "GET") {
    const url = new URL(request.url)
    const projectId = url.searchParams.get("project_id")

    if (!projectId) {
      return jsonResponse({ error: "Project ID required" }, 400)
    }

    const { results } = await db
      .prepare("SELECT * FROM chat_messages WHERE project_id = ? ORDER BY created_at ASC")
      .bind(projectId)
      .all()

    return jsonResponse(results || [])
  }

  if (method === "POST") {
    const { project_id, user_id, role, content } = await request.json()

    if (!project_id || !user_id || !role || !content) {
      return jsonResponse({ error: "Missing required fields" }, 400)
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const { results } = await db
      .prepare("INSERT INTO chat_messages (id, project_id, user_id, role, content) VALUES (?, ?, ?, ?, ?) RETURNING *")
      .bind(messageId, project_id, user_id, role, content)
      .all()

    return jsonResponse(results[0])
  }

  return jsonResponse({ error: "Invalid request" }, 400)
}

// User Preferences API
async function handlePreferencesAPI(request, db, method, pathParts) {
  if (method === "GET") {
    const url = new URL(request.url)
    const userId = url.searchParams.get("user_id")

    if (!userId) {
      return jsonResponse({ error: "User ID required" }, 400)
    }

    const { results } = await db.prepare("SELECT * FROM user_preferences WHERE user_id = ?").bind(userId).all()

    if (results.length === 0) {
      return new Response(null, { status: 404, headers: { "Access-Control-Allow-Origin": "*" } })
    }

    return jsonResponse(results[0])
  }

  if (method === "POST") {
    const { user_id, chat_panel_width, file_panel_width, theme } = await request.json()

    if (!user_id) {
      return jsonResponse({ error: "User ID required" }, 400)
    }

    const { results } = await db
      .prepare(`
      INSERT INTO user_preferences (user_id, chat_panel_width, file_panel_width, theme) 
      VALUES (?, ?, ?, ?) 
      ON CONFLICT(user_id) DO UPDATE SET 
        chat_panel_width = excluded.chat_panel_width,
        file_panel_width = excluded.file_panel_width,
        theme = excluded.theme,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `)
      .bind(user_id, chat_panel_width || 384, file_panel_width || 256, theme || "light")
      .all()

    return jsonResponse(results[0])
  }

  return jsonResponse({ error: "Invalid request" }, 400)
}

// Helper Functions
async function saveGeneratedFiles(db, userId, projectId, parsedResult) {
  const mainFileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const testFileId = `file_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`

  // Normalize content before saving
  const mainContent = normalizeContent(parsedResult.mainFile.content)
  const testContent = normalizeContent(parsedResult.testbenchFile.content)

  // Save main file
  await db
    .prepare(
      "INSERT INTO files (id, project_id, user_id, name, content, file_type, is_testbench) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(mainFileId, projectId, userId, parsedResult.mainFile.name, mainContent, "verilog", 0)
    .run()

  // Save testbench file
  await db
    .prepare(
      "INSERT INTO files (id, project_id, user_id, name, content, file_type, is_testbench) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(testFileId, projectId, userId, parsedResult.testbenchFile.name, testContent, "verilog", 1)
    .run()
}

// UPDATED: Content processing functions
function normalizeContent(content) {
  if (!content) return ""

  // Convert actual newlines to escaped newlines for database storage
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
}

function unescapeContent(content) {
  if (!content) return ""

  // Convert escaped newlines back to actual newlines for display
  return content.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t")
}

function parseAIResponse(rawResponse, originalPrompt) {
  try {
    console.log("Parsing raw AI response...")

    // First, try to find JSON in the response
    const jsonMatches = rawResponse.match(/\{[\s\S]*?\}/g)
    if (jsonMatches) {
      for (const jsonMatch of jsonMatches) {
        try {
          const parsed = JSON.parse(jsonMatch)
          if (parsed.mainFile || parsed.debugInfo) {
            // Fix file naming if needed
            if (parsed.mainFile) {
              parsed.mainFile.name = normalizeFileName(parsed.mainFile.name, false, originalPrompt)
              parsed.mainFile.content = cleanVerilogContent(parsed.mainFile.content)
            }
            if (parsed.testbenchFile) {
              parsed.testbenchFile.name = normalizeFileName(parsed.testbenchFile.name, true, originalPrompt)
              parsed.testbenchFile.content = cleanVerilogContent(parsed.testbenchFile.content)
            }
            return parsed
          }
        } catch (e) {
          continue
        }
      }
    }

    // If no valid JSON found, try to extract Verilog code
    const verilogModules = extractVerilogModules(rawResponse)
    if (verilogModules.length > 0) {
      const mainModule = verilogModules[0]
      const testbench =
        verilogModules.find((m) => m.toLowerCase().includes("testbench")) ||
        verilogModules[1] ||
        generateTestbench(mainModule)

      const baseFileName = generateBaseFileNameFromPrompt(originalPrompt)

      return {
        mainFile: {
          name: `${baseFileName}.v`,
          content: cleanVerilogContent(mainModule.trim()),
        },
        testbenchFile: {
          name: `${baseFileName}-testbench.v`,
          content: cleanVerilogContent(testbench.trim()),
        },
      }
    }

    return null
  } catch (e) {
    console.error("Failed to parse AI response:", e)
    return null
  }
}

function cleanVerilogContent(content) {
  if (!content) return ""

  // Remove HTML tags and entities
  let cleaned = content
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  // Remove style attributes
  cleaned = cleaned.replace(/"color:[^"]*"/g, "").replace(/style="[^"]*"/g, "")

  // Normalize whitespace but preserve code structure
  cleaned = cleaned
    .replace(/\r\n/g, "\n") // Normalize line endings
    .replace(/\r/g, "\n") // Convert old Mac line endings
    .replace(/\t/g, "    ") // Convert tabs to spaces
    .trim()

  return cleaned
}

function normalizeFileName(fileName, isTestbench, originalPrompt) {
  let baseName = fileName.replace(/\.v$/, "")
  baseName = baseName.replace(/_testbench$|_tb$|-testbench$|-tb$/i, "")

  if (baseName.length < 3 || baseName.match(/^(module|test|generated)/i)) {
    baseName = generateBaseFileNameFromPrompt(originalPrompt)
  }

  baseName = baseName
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  if (isTestbench) {
    return `${baseName}-testbench.v`
  }

  return `${baseName}.v`
}

function generateBaseFileNameFromPrompt(prompt) {
  const cleanPrompt = prompt
    .toLowerCase()
    .replace(/generate|create|design|build|make|write/gi, "")
    .replace(/verilog|module|code|circuit/gi, "")
    .trim()

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
      return match[0].replace(/\s+/g, "-").replace(/-+/g, "-")
    }
  }

  const words = cleanPrompt
    .split(/\s+/)
    .filter((word) => word.length > 2 && !["the", "and", "with", "for", "that"].includes(word))
    .slice(0, 3)

  if (words.length > 0) {
    return words.join("-")
  }

  return "generated-circuit"
}

function extractVerilogModules(text) {
  const modules = []
  const moduleRegex = /module\s+\w+[\s\S]*?endmodule/gi
  let match

  while ((match = moduleRegex.exec(text)) !== null) {
    modules.push(match[0])
  }

  return modules
}

function extractModuleName(moduleCode) {
  const match = moduleCode.match(/module\s+(\w+)/)
  return match ? match[1] : "generated_module"
}

function generateTestbench(mainModule) {
  const moduleName = extractModuleName(mainModule)
  const inputs = extractPorts(mainModule, "input")
  const outputs = extractPorts(mainModule, "output")

  let testbench = `module ${moduleName}_testbench;\n\n`

  inputs.forEach((input) => {
    testbench += `reg ${input};\n`
  })

  testbench += "\n"

  outputs.forEach((output) => {
    testbench += `wire ${output};\n`
  })

  testbench += `\n// Instantiate the Unit Under Test (UUT)\n`
  testbench += `${moduleName} uut (\n`

  const allPorts = [...inputs, ...outputs]
  allPorts.forEach((port, index) => {
    testbench += `  .${port}(${port})`
    if (index < allPorts.length - 1) testbench += ","
    testbench += "\n"
  })

  testbench += `);\n\n`
  testbench += `initial begin\n`
  testbench += `  // Initialize inputs\n`

  inputs.forEach((input) => {
    testbench += `  ${input} = 0;\n`
  })

  testbench += `  \n  // Add test cases here\n`
  testbench += `  #10;\n`
  testbench += `  \n  $display("Testbench completed");\n`
  testbench += `  $finish;\n`
  testbench += `end\n\n`
  testbench += `endmodule`

  return testbench
}

function extractPorts(moduleCode, portType) {
  const ports = []
  const regex = new RegExp(`${portType}\\s+(?:\\[[^\\]]+\\]\\s+)?(\\w+)`, "gi")
  let match

  while ((match = regex.exec(moduleCode)) !== null) {
    ports.push(match[1])
  }

  return ports
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  })
}
