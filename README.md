````markdown
# circuit-json-to-step

Convert [Circuit JSON](https://github.com/tscircuit/circuit-json) to STEP format for CAD integration.

## Installation

```bash
npm install circuit-json-to-step
# or
bun add circuit-json-to-step
```

## Usage

### Basic Example

```typescript
import { circuitJsonToStep } from "circuit-json-to-step"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_1",
    width: 20,
    height: 15,
    thickness: 1.6,
    center: { x: 0, y: 0 },
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "pcb_hole_1",
    hole_shape: "circle",
    hole_diameter: 3.2,
    x: 2.5,
    y: 2.5,
  },
]

const stepText = await circuitJsonToStep(circuitJson, {
  boardWidth: 20,
  boardHeight: 15,
  boardThickness: 1.6,
  productName: "MyPCB",
})
await Bun.write("output.step", stepText)
```

### Merging External STEP Files

You can merge external STEP files (e.g., component 3D models) into your PCB design using the `model_step_url` field in `cad_component` elements:

```typescript
import { circuitJsonToStep } from "circuit-json-to-step"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_1",
    width: 50,
    height: 50,
    thickness: 1.6,
    center: { x: 0, y: 0 },
  },
  {
    type: "cad_component",
    cad_component_id: "comp_1",
    position: { x: 10, y: 10, z: 2 },
    rotation: { x: 0, y: 0, z: 45 }, // Rotation in degrees
    model_step_url: "https://example.com/component.step", // Or local path
    model_unit_to_mm_scale_factor: 1.0, // Scale factor (default: 1.0)
  },
]

const stepText = await circuitJsonToStep(circuitJson, {
  productName: "MyPCB",
  includeComponents: true,
  includeExternalMeshes: true, // Enable external STEP merging
})
```

**Features:**
- Fetches STEP files from URLs or local paths
- Applies coordinate transformations (position, rotation, scale)
- Merges multiple external STEP models into a single output
- Handles entity ID conflicts automatically

**Options:**
- `includeComponents`: Set to `true` to include component meshes (default: `false`)
- `includeExternalMeshes`: Set to `true` to fetch and merge external STEP files from `model_step_url` (default: `false`)

**Note:** External STEP files must be valid ISO 10303-21 (STEP) format files containing `MANIFOLD_SOLID_BREP` entities.

### Advanced: Direct STEP Merging

You can also use the STEP merging utilities directly:

```typescript
import { fetchStepFile, mergeStepFile, parseStepFile } from "circuit-json-to-step"
import { Repository } from "stepts"

// Fetch a STEP file
const stepContent = await fetchStepFile("./model.step")

// Parse a STEP file
const parsed = parseStepFile(stepContent)
console.log(`Found ${parsed.entities.size} entities`)

// Merge into an existing repository
const targetRepo = new Repository()
const mergedSolids = mergeStepFile(stepContent, targetRepo, {
  position: { x: 10, y: 20, z: 5 },
  rotation: { x: 0, y: 0, z: 45 },
  scale: 2.0,
})

console.log(`Merged ${mergedSolids.length} solids`)
```

## Related Projects

- [circuit-json](https://github.com/tscircuit/circuit-json) - Circuit JSON specification
- [stepts](https://github.com/tscircuit/stepts) - STEP file generation library
- [tscircuit](https://github.com/tscircuit/tscircuit) - Design circuits with code

## License

MIT

````
