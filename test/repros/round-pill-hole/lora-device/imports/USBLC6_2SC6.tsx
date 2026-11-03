import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["pin1"],
  pin2: ["pin2"],
  pin3: ["pin3"],
  pin4: ["pin4"],
  pin5: ["pin5"],
  pin6: ["pin6"],
} as const

const pinAttributes = {
  pin1: { isPassive: true },
  pin2: { requiresGround: true, mustBeConnected: true },
  pin3: { isPassive: true },
  pin4: { isPassive: true },
  pin5: {
    requiresPower: true,
    isPassive: true,
    mustBeConnected: true,
    shouldHaveDecouplingCapacitor: true,
    recommendedDecouplingCapacitorCapacitance: "100nF",
  },
  pin6: { isPassive: true },
} satisfies NonNullable<ChipProps["pinAttributes"]>

export const USBLC6_2SC6 = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      pinAttributes={pinAttributes}
      supplierPartNumbers={{
        jlcpcb: ["C7519"],
      }}
      manufacturerPartNumber="USBLC6-2SC6"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin1"]}
            pcbX="-0.94996mm"
            pcbY="-1.149096mm"
            width="0.532003mm"
            height="1.072007mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin2"]}
            pcbX="0mm"
            pcbY="-1.149096mm"
            width="0.532003mm"
            height="1.072007mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin3"]}
            pcbX="0.94996mm"
            pcbY="-1.149096mm"
            width="0.532003mm"
            height="1.072007mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin4"]}
            pcbX="0.94996mm"
            pcbY="1.149096mm"
            width="0.532003mm"
            height="1.072007mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin5"]}
            pcbX="0mm"
            pcbY="1.149096mm"
            width="0.532003mm"
            height="1.072007mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin6"]}
            pcbX="-0.94996mm"
            pcbY="1.149096mm"
            width="0.532003mm"
            height="1.072007mm"
            shape="rect"
          />
          <courtyardoutline
            outline={[
              { x: -1.6999843999999484, y: 1.9350994999999784 },
              { x: 1.7000097999999753, y: 1.9350994999999784 },
              { x: 1.7000097999999753, y: -1.9350994999998647 },
              { x: -1.6999843999999484, y: -1.9350994999998647 },
              { x: -1.6999843999999484, y: 1.9350994999999784 },
            ]}
          />
        </footprint>
      }
      {...props}
    />
  )
}
