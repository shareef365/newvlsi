export const runtime = "edge";
export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return Response.json({ error: "No prompt provided" }, { status: 400 })
    }

    console.log("Sending prompt to worker:", prompt)

    // Call your Cloudflare Worker
    const response = await fetch("https://testvlsiworker.arshadahmedshareef101.workers.dev/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    })

    console.log("Worker response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Worker error response:", errorText)
      throw new Error(`Worker responded with status: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log("Worker response:", result)

    // If the worker couldn't parse the AI response, we'll handle it here
    if (result.error === "AI response parsing failed" && result.rawResponse) {
      console.log("Attempting to parse raw AI response:", result.rawResponse)

      // Try to parse the raw response ourselves
      const parsedResult = parseAIResponse(result.rawResponse, prompt)
      if (parsedResult) {
        console.log("Successfully parsed raw response:", parsedResult)
        return Response.json(parsedResult)
      }

      // If we still can't parse it, return the raw response for the user to see
      return Response.json({
        error: "Could not parse AI response",
        rawResponse: result.rawResponse,
        suggestion: "The AI model returned unstructured text. Here's what it generated:",
      })
    }

    // Check if the worker returned other errors
    if (result.error) {
      console.error("Worker returned error:", result.error)
      return Response.json({
        error: result.error,
        rawResponse: result.rawResponse || null,
        suggestion: "Try rephrasing your prompt or check if the worker is configured correctly.",
      })
    }

    return Response.json(result)
  } catch (error) {
    console.error("Error calling Cloudflare Worker:", error)
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error occurred",
        details: "Check server logs for more information",
      },
      { status: 500 },
    )
  }
}

// Replace the existing cleanVerilogContent function with this improved version
function cleanVerilogContent(content: string): string {
  if (!content) return ""

  // Remove HTML tags and styling
  let cleaned = content
    .replace(/<[^>]*>/g, "") // Remove all HTML tags
    .replace(/&lt;/g, "<") // Decode HTML entities
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")

  // Remove any remaining style attributes or color codes
  cleaned = cleaned
    .replace(/"color:[^"]*"/g, "")
    .replace(/style="[^"]*"/g, "")
    .replace(/class="[^"]*"/g, "")

  // Handle various escape sequences properly
  cleaned = cleaned
    .replace(/\\n/g, "\n") // Convert escaped newlines to actual newlines
    .replace(/\\r\\n/g, "\n") // Handle Windows-style escaped newlines
    .replace(/\\r/g, "\n") // Handle Mac-style escaped newlines
    .replace(/\\t/g, "    ") // Convert escaped tabs to 4 spaces
    .replace(/\\\\/g, "\\") // Unescape double backslashes

  // Normalize line endings
  cleaned = cleaned
    .replace(/\r\n/g, "\n") // Windows to Unix
    .replace(/\r/g, "\n") // Old Mac to Unix

  // Clean up whitespace while preserving code structure
  cleaned = cleaned
    .replace(/[ \t]+$/gm, "") // Remove trailing whitespace from each line
    .replace(/\n{3,}/g, "\n\n") // Limit consecutive blank lines to 2
    .trim()

  return cleaned
}

// Function to normalize file names to the correct format
function normalizeFileName(fileName: string, isTestbench: boolean, originalPrompt: string): string {
  // Remove .v extension if present
  let baseName = fileName.replace(/\.v$/, "")

  // Remove common testbench suffixes
  baseName = baseName.replace(/_testbench$|_tb$|-testbench$|-tb$/i, "")

  // If the base name is too generic, try to extract from prompt
  if (baseName.length < 3 || baseName.match(/^(module|test|generated)/i)) {
    baseName = generateBaseFileNameFromPrompt(originalPrompt)
  }

  // Convert to kebab-case (lowercase with hyphens)
  baseName = baseName
    .replace(/([a-z])([A-Z])/g, "$1-$2") // camelCase to kebab-case
    .replace(/[_\s]+/g, "-") // underscores and spaces to hyphens
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "") // remove invalid characters
    .replace(/-+/g, "-") // multiple hyphens to single
    .replace(/^-|-$/g, "") // remove leading/trailing hyphens

  // Add testbench suffix if needed
  if (isTestbench) {
    return `${baseName}-testbench.v`
  }

  return `${baseName}.v`
}

// Function to generate base file name from prompt
function generateBaseFileNameFromPrompt(prompt: string): string {
  // Extract meaningful terms from the prompt
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
      return match[0].replace(/\s+/g, "-").replace(/-+/g, "-")
    }
  }

  // Fallback: use first few meaningful words
  const words = cleanPrompt
    .split(/\s+/)
    .filter((word) => word.length > 2 && !["the", "and", "with", "for", "that"].includes(word))
    .slice(0, 3)

  if (words.length > 0) {
    return words.join("-")
  }

  // Final fallback
  return "generated-circuit"
}

function extractVerilogModules(text: string): string[] {
  const modules = []
  const moduleRegex = /module\s+\w+[\s\S]*?endmodule/gi
  let match

  while ((match = moduleRegex.exec(text)) !== null) {
    modules.push(match[0])
  }

  return modules
}

function extractModuleName(moduleCode: string): string {
  const match = moduleCode.match(/module\s+(\w+)/)
  return match ? match[1] : "generated_module"
}

function generateTestbench(mainModule: string): string {
  const moduleName = extractModuleName(mainModule)

  // Extract inputs and outputs from the main module
  const inputs = extractPorts(mainModule, "input")
  const outputs = extractPorts(mainModule, "output")

  let testbench = `module ${moduleName}_testbench;\n\n`

  // Declare inputs as reg
  inputs.forEach((input) => {
    testbench += `reg ${input};\n`
  })

  testbench += "\n"

  // Declare outputs as wire
  outputs.forEach((output) => {
    testbench += `wire ${output};\n`
  })

  testbench += `\n// Instantiate the Unit Under Test (UUT)\n`
  testbench += `${moduleName} uut (\n`

  // Connect ports
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

function extractPorts(moduleCode: string, portType: "input" | "output"): string[] {
  const ports = []
  const regex = new RegExp(`${portType}\\s+(?:\\[[^\\]]+\\]\\s+)?(\\w+)`, "gi")
  let match

  while ((match = regex.exec(moduleCode)) !== null) {
    ports.push(match[1])
  }

  return ports
}

// Dummy implementation for parseAIResponse
function parseAIResponse(rawResponse: string, prompt: string): any {
  // Implement your parsing logic here
  // This is just a placeholder
  console.warn("parseAIResponse function is a placeholder. Implement actual parsing logic.")
  return null
}
