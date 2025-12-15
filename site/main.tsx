import { circuitJsonToStep } from "../lib/index"

// Get DOM elements
const uploadArea = document.getElementById("uploadArea")!
const fileInput = document.getElementById("fileInput")! as HTMLInputElement
const fileInfo = document.getElementById("fileInfo")!
const fileName = document.getElementById("fileName")!
const fileSize = document.getElementById("fileSize")!
const convertBtn = document.getElementById("convertBtn")! as HTMLButtonElement
const clearBtn = document.getElementById("clearBtn")!
const status = document.getElementById("status")!
const includeComponentsCheckbox = document.getElementById(
  "includeComponents",
)! as HTMLInputElement
const includeExternalMeshesCheckbox = document.getElementById(
  "includeExternalMeshes",
)! as HTMLInputElement

let currentFile: File | null = null
let circuitJson: any = null

// Handle click on upload area
uploadArea.addEventListener("click", () => {
  fileInput.click()
})

// Handle file selection
fileInput.addEventListener("change", (e) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0 && target.files[0]) {
    handleFile(target.files[0])
  }
})

// Handle drag over
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault()
  uploadArea.classList.add("dragover")
})

// Handle drag leave
uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragover")
})

// Handle drop
uploadArea.addEventListener("drop", (e) => {
  e.preventDefault()
  uploadArea.classList.remove("dragover")

  if (
    e.dataTransfer &&
    e.dataTransfer.files.length > 0 &&
    e.dataTransfer.files[0]
  ) {
    handleFile(e.dataTransfer.files[0])
  }
})

// Handle includeComponents checkbox change
includeComponentsCheckbox.addEventListener("change", () => {
  if (!includeComponentsCheckbox.checked) {
    includeExternalMeshesCheckbox.checked = false
    includeExternalMeshesCheckbox.disabled = true
  } else {
    includeExternalMeshesCheckbox.disabled = false
  }
})

// Initialize external meshes checkbox state
includeExternalMeshesCheckbox.disabled = true

// Handle file
async function handleFile(file: File) {
  currentFile = file

  // Show file info
  fileName.textContent = file.name
  fileSize.textContent = `${(file.size / 1024).toFixed(2)} KB`
  fileInfo.classList.add("visible")

  // Read and parse the file
  try {
    showStatus("Reading file...", "processing")
    const text = await file.text()
    circuitJson = JSON.parse(text)

    // Enable convert button
    convertBtn.disabled = false
    showStatus("File loaded successfully! Ready to convert.", "success")
  } catch (error) {
    showStatus(
      `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
      "error",
    )
    convertBtn.disabled = true
    circuitJson = null
  }
}

// Convert and download
convertBtn.addEventListener("click", async () => {
  if (!circuitJson) return

  try {
    showStatus("Converting to STEP format...", "processing")
    convertBtn.disabled = true

    // Allow UI to update
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Get base filename without extension
    const baseName = currentFile!.name.replace(/\.json$/i, "")

    // Get options from checkboxes
    const includeComponents = includeComponentsCheckbox.checked
    const includeExternalMeshes = includeExternalMeshesCheckbox.checked

    // Capture console warnings during conversion
    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (...args: any[]) => {
      const msg = args.map((a) => String(a)).join(" ")
      if (msg.includes("Failed to merge STEP model")) {
        // Extract just the filename from the path/URL
        const pathMatch =
          msg.match(/from ([^:]+:.*?)(?=:|$)/) || msg.match(/from (\S+)/)
        if (pathMatch) {
          const fullPath = pathMatch[1]
          // Get just the filename
          const filename = fullPath.split(/[/\\]/).pop() || fullPath
          warnings.push(`Could not load: ${filename}`)
        }
      }
      originalWarn.apply(console, args)
    }

    // Convert to STEP
    const stepContent = await circuitJsonToStep(circuitJson, {
      includeComponents,
      includeExternalMeshes: includeComponents && includeExternalMeshes,
    })

    // Restore console.warn
    console.warn = originalWarn

    // Download the STEP file
    downloadFile(`${baseName}.step`, stepContent)

    if (warnings.length > 0) {
      showStatus(
        `Conversion complete with warnings:\n${warnings.slice(0, 3).join("\n")}${warnings.length > 3 ? `\n...and ${warnings.length - 3} more` : ""}`,
        "success",
      )
    } else {
      showStatus("Conversion complete! File downloaded.", "success")
    }
    convertBtn.disabled = false
  } catch (error) {
    showStatus(
      `Error during conversion: ${error instanceof Error ? error.message : String(error)}`,
      "error",
    )
    convertBtn.disabled = false
    console.error(error)
  }
})

// Clear button
clearBtn.addEventListener("click", () => {
  currentFile = null
  circuitJson = null
  fileInput.value = ""
  fileInfo.classList.remove("visible")
  convertBtn.disabled = true
  hideStatus()
})

// Helper function to download a file
function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/step" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Helper function to show status
function showStatus(message: string, type: "success" | "error" | "processing") {
  status.textContent = message
  status.className = `status visible ${type}`
}

// Helper function to hide status
function hideStatus() {
  status.classList.remove("visible")
}
