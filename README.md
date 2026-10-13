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

### Assemblies

`circuitJsonToStep(circuitJson)` exports the complete design by default and always
returns one STEP string. The file contains one named parent assembly with
separate named children for the PCB, printed parts, ordinary assembly parts, and
PCB component models. Touching parts remain separate bodies. The converter does
not create ZIP archives or filename-to-content maps.

```typescript
const stepText = await circuitJsonToStep(circuitJson, {
  productName: "My device",
  fsMap: { "./models/bracket.step": preloadedStepText },
})
await Bun.write("my-device.step", stepText)
```

JSCAD and imported STEP parts retain their geometry, colors, model origins,
uniform unit scales, rotations, and placements. Each CAD model becomes a named
child; multiple models can share the same part name. PCB components and imported
STL, OBJ, GLB, and GLTF printed parts use the existing scene geometry converter.
Mesh bodies share their vertices and edges. Failed external meshes, unsupported
or missing geometry produce an error instead of a partial assembly. Relative
STEP paths must be provided as plain STEP text in `fsMap`, keyed
by the exact `model_step_url`; uncached STEP files require an HTTP(S) URL.
Imported STEP files that contain their own assembly occurrences are rejected
with the offending part name; nested imported assembly hierarchies are not yet
supported.

Multi-board assemblies include every board, named by its `pcb_board_id`; a single
board retains the name "PCB". Holes use explicit board/subcircuit ownership when
available, or their location when exactly one board contains them. Ambiguous hole
ownership is an error. PCB components infer board thickness from a unique
subcircuit match; ambiguous ownership with different board thicknesses is an
error.

Omitting `exportMode` always selects the complete assembly, including PCB-only
designs with component models, mixed PCB and assembly designs, printed-only
designs, multiple boards, and CAD models without source components. No special
part tags or component-inclusion flags are required for the default export.
Passing `exportMode: "assembly"` is equivalent to omitting it.

`exportMode: "pcb"` retains the existing PCB behavior. `includeComponents` and
`includeExternalMeshes` default to false in PCB mode. Assembly mode includes all
CAD parts and PCB components; `includeExternalMeshes` defaults to true for its
non-STEP mesh fallback. `productName` defaults to "PCB" in PCB mode and "Combined
Assembly" in assembly mode. Empty assemblies produce an error.

This changes the assembly-mode return type from `Record<string, string>` to
`string`. Consumers should download that string as a single `.step` file.

## Related Projects

- [circuit-json](https://github.com/tscircuit/circuit-json) - Circuit JSON specification
- [stepts](https://github.com/tscircuit/stepts) - STEP file generation library
- [tscircuit](https://github.com/tscircuit/tscircuit) - Design circuits with code

## License

MIT
