import type { ChipProps } from "@tscircuit/props"

// Seeed Wio-SX1262 Module Datasheet, figure 9 (top-view landing pattern).
// The IPEX version does not connect the carrier's ANT pad.
export const WioSx1262 = (props: ChipProps) => (
  <chip
    manufacturerPartNumber="Wio-SX1262"
    pinLabels={{
      pin1: "RF_SW",
      pin2: "MISO",
      pin3: "MOSI",
      pin4: "SCK",
      pin5: "NRST",
      pin6: "NSS",
      pin7: "GND1",
      pin8: "VCC",
      pin9: "ANT_NC",
      pin10: "GND2",
      pin11: "BUSY",
      pin12: "DIO1",
    }}
    pinAttributes={{
      VCC: { requiresPower: true },
      GND1: { requiresGround: true },
      GND2: { requiresGround: true },
    }}
    noConnect={["RF_SW", "ANT_NC"]}
    footprint={
      <footprint>
        <smtpad
          portHints={["pin1"]}
          pcbX={-4.47}
          pcbY={-5.5}
          width={0.6}
          height={2.2}
          shape="rect"
        />
        <smtpad
          portHints={["pin2"]}
          pcbX={-3.2}
          pcbY={-5.5}
          width={0.6}
          height={2.2}
          shape="rect"
        />
        <smtpad
          portHints={["pin3"]}
          pcbX={-1.93}
          pcbY={-5.5}
          width={0.6}
          height={2.2}
          shape="rect"
        />
        <smtpad
          portHints={["pin4"]}
          pcbX={-0.66}
          pcbY={-5.5}
          width={0.6}
          height={2.2}
          shape="rect"
        />
        <smtpad
          portHints={["pin5"]}
          pcbX={0.61}
          pcbY={-5.5}
          width={0.6}
          height={2.2}
          shape="rect"
        />
        <smtpad
          portHints={["pin6"]}
          pcbX={1.88}
          pcbY={-5.5}
          width={0.6}
          height={2.2}
          shape="rect"
        />
        <smtpad
          portHints={["pin7"]}
          pcbX={3.15}
          pcbY={-5.5}
          width={0.6}
          height={2.2}
          shape="rect"
        />
        <smtpad
          portHints={["pin8"]}
          pcbX={4.42}
          pcbY={-5.5}
          width={0.6}
          height={2.2}
          shape="rect"
        />
        <smtpad
          portHints={["pin12"]}
          pcbX={-3.2}
          pcbY={5.5}
          width={0.6}
          height={2.2}
          shape="rect"
        />
        <smtpad
          portHints={["pin11"]}
          pcbX={-1.93}
          pcbY={5.5}
          width={0.6}
          height={2.2}
          shape="rect"
        />
        <smtpad
          portHints={["pin10"]}
          pcbX={-0.66}
          pcbY={5.5}
          width={0.6}
          height={2.2}
          shape="rect"
        />
        <smtpad
          portHints={["pin9"]}
          pcbX={0.61}
          pcbY={5.5}
          width={0.6}
          height={2.2}
          shape="rect"
        />
        <courtyardrect width={12.1} height={13.7} />
      </footprint>
    }
    {...props}
  />
)
