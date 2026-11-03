# Round pill drill blocks STEP export

Source: [gokul/lora-device v0.1.6](https://tscircuit.com/gokul/lora-device), generated with `@tscircuit/core` 0.0.2172.

Run from the repository root:

```sh
bun test test/repros/round-pill-hole/round-pill-hole.test.tsx
```

The test imports the complete board from `lora-device/index.circuit.tsx`, renders it with Core, and passes the freshly generated Circuit JSON to the STEP exporter. All 58 components, their connections, footprints, placement, board geometry, and twelve schematic sections are retained. The original routing configuration and reviewed routes are included with the source.

J2 pins 2 and 3 use `shape="pill"` with `holeWidth="0.75mm"` and `holeHeight="0.75mm"` in `lora-device/components/BatteryConnector.tsx`. Core generates two equal-dimension pill drills. Both default and PCB-only STEP export then throw `STEP real must be finite` instead of returning a board model.

The test disables schematic layout and trace routing, which are not needed to generate the component holes. Component `cadModel` attributes and their mesh imports are omitted; the crash occurs in board geometry before component models are processed. Three type-only imports use `@tscircuit/props` directly instead of the `tscircuit` umbrella package. The resistor part-number mapping is retained without its model lookup. These are the only source adaptations apart from formatting.

`lora-device-input.snap.png` shows the generated top-side PCB with routing disabled. `round-pill-hole-input.snap.png` preserves the original J2 pin 3 close-up, now extracted from the generated board. Neither image is a STEP output. A control isolates that generated hole and changes only its drill height to 1.25 mm; the resulting STEP file imports successfully with OCCT.

The passing rejection assertions deliberately record the current bug. A fix should replace them with successful-export and through-hole checks, and add a STEP-output snapshot using the same TSX fixture.
