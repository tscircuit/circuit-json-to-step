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

### Printed-part assemblies

Export JSCAD-backed `assembly.printedpart` elements as separate named parts in a
STEP assembly.

The parent assembly is named `Combined Assembly` by default. Set `productName` to
provide a custom name.

```typescript
const stepText = await circuitJsonToStep(circuitJson, {
  exportMode: "assembly",
  productName: "Enclosure",
})
await Bun.write("enclosure.step", stepText)
```

Assembly mode selects `source_component` entries with `ftype: "printedpart"` and
their associated `cad_component.model_jscad` geometry. Each CAD model becomes a
named child product of the root assembly. Translation and rotation are stored as
assembly placements; model origins and unit scale factors are applied to local
geometry. Touching or overlapping parts stay separate.

A design containing printed parts and no PCB or explicit board dimensions selects
assembly mode automatically. Designs with a PCB keep the existing PCB export by
default. Use `exportMode: "assembly"` to select printed parts from a mixed device,
or `exportMode: "pcb"` to explicitly request the existing PCB export.

Motors, boards, cables, and other mechanical parts are excluded from printed-part
assemblies. Printed parts without JSCAD geometry, including imported STL/GLB
models, produce an error instead of being omitted. The output has one root
assembly with named children; nested Circuit JSON groups are not reconstructed.

## Related Projects

- [circuit-json](https://github.com/tscircuit/circuit-json) - Circuit JSON specification
- [stepts](https://github.com/tscircuit/stepts) - STEP file generation library
- [tscircuit](https://github.com/tscircuit/tscircuit) - Design circuits with code

## License

MIT
