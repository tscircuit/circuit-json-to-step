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

## Related Projects

- [circuit-json](https://github.com/tscircuit/circuit-json) - Circuit JSON specification
- [stepts](https://github.com/tscircuit/stepts) - STEP file generation library
- [tscircuit](https://github.com/tscircuit/tscircuit) - Design circuits with code

## License

MIT
