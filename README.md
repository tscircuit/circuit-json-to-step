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
  exportMode: "pcb",
  boardWidth: 20,
  boardHeight: 15,
  boardThickness: 1.6,
  productName: "MyPCB",
})
await Bun.write("output.step", stepText)
```

### Printed parts

With `exportMode: "assembly"`, `circuitJsonToStep` exports one STEP file per
`assembly.printedpart` and returns a filename-to-STEP-content map. A touching case
base and switch plate produce two independently printable files, including when
the circuit also contains a PCB.

```typescript
const files = await circuitJsonToStep(circuitJson, { exportMode: "assembly" })
for (const [fileName, stepText] of Object.entries(files)) {
  await Bun.write(fileName, stepText)
}
```

Printed-part files retain their model geometry, units, origins, rotations, and
placements. All CAD models belonging to one printed part stay in that part's
file. File names come from part names, with unsafe characters replaced and
numeric suffixes added for collisions. `productName` sets the root product name
in each file; it defaults to that printed part's name.

PCBs and ordinary `assembly.part` elements are excluded from printed-part files.
Missing or unsupported printed-part geometry produces an error rather than
silently omitting a part. Printed parts currently require JSCAD geometry.

PCB mode retains the single STEP string result. When `exportMode` is omitted,
the existing selection is unchanged: inputs containing a PCB or board dimensions
select PCB mode; printed-only inputs select assembly mode. Assembly mode reports
an error when no printed parts are present.

## Related Projects

- [circuit-json](https://github.com/tscircuit/circuit-json) - Circuit JSON specification
- [stepts](https://github.com/tscircuit/stepts) - STEP file generation library
- [tscircuit](https://github.com/tscircuit/tscircuit) - Design circuits with code

## License

MIT
