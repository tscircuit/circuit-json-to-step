import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["VIN"],
  pin2: ["GND"],
  pin3: ["ON"],
  pin4: ["CT"],
  pin5: ["QOD"],
  pin6: ["VOUT"],
} as const

const pinAttributes = {
  pin1: { isInput: true, requiresPower: true, mustBeConnected: true },
  pin2: { isPassive: true, requiresGround: true, mustBeConnected: true },
  pin3: { isInput: true, mustBeConnected: true },
  pin6: { isOutput: true, providesPower: true },
  pin5: { isOutput: true },
  pin4: { isOutput: true },
} satisfies NonNullable<ChipProps["pinAttributes"]>

export const TPS22918DBVR = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      pinAttributes={pinAttributes}
      supplierPartNumbers={{
        jlcpcb: ["C131941"],
      }}
      manufacturerPartNumber="TPS22918DBVR"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin3"]}
            pcbX="1.35001mm"
            pcbY="0.94996mm"
            width="1.0999978mm"
            height="0.5999988mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin2"]}
            pcbX="1.35001mm"
            pcbY="-0mm"
            width="1.0999978mm"
            height="0.5999988mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin1"]}
            pcbX="1.35001mm"
            pcbY="-0.94996mm"
            width="1.0999978mm"
            height="0.5999988mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin6"]}
            pcbX="-1.35001mm"
            pcbY="-0.94996mm"
            width="1.0999978mm"
            height="0.5999988mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin5"]}
            pcbX="-1.35001mm"
            pcbY="-0mm"
            width="1.0999978mm"
            height="0.5999988mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin4"]}
            pcbX="-1.35001mm"
            pcbY="0.94996mm"
            width="1.0999978mm"
            height="0.5999988mm"
            shape="rect"
          />
          <courtyardoutline
            outline={[
              { x: -2.150008899999989, y: 1.6999081999999817 },
              { x: 2.150008899999989, y: 1.6999081999999817 },
              { x: 2.150008899999989, y: -1.700085999999942 },
              { x: -2.150008899999989, y: -1.700085999999942 },
              { x: -2.150008899999989, y: 1.6999081999999817 },
            ]}
          />
        </footprint>
      }
      {...props}
    />
  )
}
