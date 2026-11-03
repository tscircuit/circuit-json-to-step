import type { ConnectorProps } from "@tscircuit/props"
export const BatteryConnector = (props: ConnectorProps) => (
  <connector
    pinLabels={{ pin1: "BAT_POS", pin2: "GND", pin3: "NTC" }}
    pinAttributes={{
      BAT_POS: { providesPower: true },
      GND: { requiresGround: true },
      NTC: { isPassive: true },
    }}
    footprint={
      <footprint insertionDirection="from_above">
        <platedhole
          portHints={["1"]}
          pcbX="0mm"
          pcbY="0mm"
          holeShape="circle"
          padShape="rect"
          holeDiameter="0.75mm"
          rectPadWidth="1.2mm"
          rectPadHeight="1.75mm"
          rectBorderRadius="0.1249998mm"
          holeOffsetX="0mm"
          holeOffsetY="0mm"
          pcbRotation="0deg"
          shape="circular_hole_with_rect_pad"
        />
        <platedhole
          portHints={["2"]}
          pcbX="2mm"
          pcbY="0mm"
          outerHeight="1.75mm"
          outerWidth="1.2mm"
          holeHeight="0.75mm"
          holeWidth="0.75mm"
          shape="pill"
          pcbRotation="0deg"
        />
        <platedhole
          portHints={["3"]}
          pcbX="4mm"
          pcbY="0mm"
          outerHeight="1.75mm"
          outerWidth="1.2mm"
          holeHeight="0.75mm"
          holeWidth="0.75mm"
          shape="pill"
          pcbRotation="0deg"
        />
        <courtyardrect
          pcbX={2}
          pcbY={-0.5499999999999998}
          width={8.9}
          height={5.5}
          layer="top"
          pcbRotation="0deg"
        />
      </footprint>
    }
    {...props}
  />
)
