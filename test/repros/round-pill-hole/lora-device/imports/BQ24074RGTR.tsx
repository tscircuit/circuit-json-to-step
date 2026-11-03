import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["TS"],
  pin2: ["BAT1"],
  pin3: ["BAT2"],
  pin4: ["N_CE"],
  pin5: ["EN2"],
  pin6: ["EN1"],
  pin7: ["N_PGOOD"],
  pin8: ["VSS"],
  pin9: ["N_CHG"],
  pin10: ["OUT1"],
  pin11: ["OUT2"],
  pin12: ["ILIM"],
  pin13: ["IN"],
  pin14: ["TMR"],
  pin15: ["ITERM"],
  pin16: ["ISET"],
  pin17: ["EP"],
} as const

const pinAttributes = {
  pin8: { isPassive: true, requiresGround: true, mustBeConnected: true },
  pin1: { isInput: true },
  pin2: {
    isBidirectional: true,
    providesPower: true,
    requiresPower: true,
    shouldHaveDecouplingCapacitor: true,
  },
  pin3: {
    isBidirectional: true,
    providesPower: true,
    requiresPower: true,
    shouldHaveDecouplingCapacitor: true,
  },
  pin4: { isInput: true, mustBeConnected: true, canUseInternalPulldown: true },
  pin5: { isInput: true, mustBeConnected: true, canUseInternalPulldown: true },
  pin6: { isInput: true, mustBeConnected: true, canUseInternalPulldown: true },
  pin7: { isOutput: true, needsExternalPullup: true, canUseOpenDrain: true },
  pin9: { isOutput: true, needsExternalPullup: true, canUseOpenDrain: true },
  pin10: {
    isOutput: true,
    providesPower: true,
    shouldHaveDecouplingCapacitor: true,
  },
  pin11: {
    isOutput: true,
    providesPower: true,
    shouldHaveDecouplingCapacitor: true,
  },
  pin12: { isInput: true },
  pin13: {
    isInput: true,
    requiresPower: true,
    shouldHaveDecouplingCapacitor: true,
  },
  pin14: { isInput: true },
  pin15: { isInput: true },
  pin16: { isBidirectional: true },
  pin17: { isPassive: true, requiresGround: true, mustBeConnected: true },
} satisfies NonNullable<ChipProps["pinAttributes"]>

export const BQ24074RGTR = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      pinAttributes={pinAttributes}
      supplierPartNumbers={{
        jlcpcb: ["C54313"],
      }}
      manufacturerPartNumber="BQ24074RGTR"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin1"]}
            pcbX="-1.499997mm"
            pcbY="0.750189mm"
            width="0.850011mm"
            height="0.2800096mm"
            radius="0.1400048mm"
            shape="pill"
          />
          <smtpad
            portHints={["pin2"]}
            pcbX="-1.499997mm"
            pcbY="0.250063mm"
            width="0.850011mm"
            height="0.2800096mm"
            radius="0.1400048mm"
            shape="pill"
          />
          <smtpad
            portHints={["pin3"]}
            pcbX="-1.499997mm"
            pcbY="-0.249809mm"
            width="0.850011mm"
            height="0.2800096mm"
            radius="0.1400048mm"
            shape="pill"
          />
          <smtpad
            portHints={["pin4"]}
            pcbX="-1.499997mm"
            pcbY="-0.749935mm"
            width="0.850011mm"
            height="0.2800096mm"
            radius="0.1400048mm"
            shape="pill"
          />
          <smtpad
            portHints={["pin5"]}
            pcbX="-0.749935mm"
            pcbY="-1.499997mm"
            width="0.2800096mm"
            height="0.850011mm"
            radius="0.1400048mm"
            shape="pill"
          />
          <smtpad
            portHints={["pin6"]}
            pcbX="-0.249809mm"
            pcbY="-1.499997mm"
            width="0.2800096mm"
            height="0.850011mm"
            radius="0.1400048mm"
            shape="pill"
          />
          <smtpad
            portHints={["pin7"]}
            pcbX="0.250063mm"
            pcbY="-1.499997mm"
            width="0.2800096mm"
            height="0.850011mm"
            radius="0.1400048mm"
            shape="pill"
          />
          <smtpad
            portHints={["pin8"]}
            pcbX="0.750189mm"
            pcbY="-1.499997mm"
            width="0.2800096mm"
            height="0.850011mm"
            radius="0.1400048mm"
            shape="pill"
          />
          <smtpad
            portHints={["pin9"]}
            pcbX="1.499997mm"
            pcbY="-0.749935mm"
            width="0.850011mm"
            height="0.2800096mm"
            radius="0.1400048mm"
            shape="pill"
          />
          <smtpad
            portHints={["pin10"]}
            pcbX="1.499997mm"
            pcbY="-0.249809mm"
            width="0.850011mm"
            height="0.2800096mm"
            radius="0.1400048mm"
            shape="pill"
          />
          <smtpad
            portHints={["pin11"]}
            pcbX="1.499997mm"
            pcbY="0.250063mm"
            width="0.850011mm"
            height="0.2800096mm"
            radius="0.1400048mm"
            shape="pill"
          />
          <smtpad
            portHints={["pin12"]}
            pcbX="1.499997mm"
            pcbY="0.750189mm"
            width="0.850011mm"
            height="0.2800096mm"
            radius="0.1400048mm"
            shape="pill"
          />
          <smtpad
            portHints={["pin13"]}
            pcbX="0.750189mm"
            pcbY="1.499997mm"
            width="0.2800096mm"
            height="0.850011mm"
            radius="0.1400048mm"
            shape="pill"
          />
          <smtpad
            portHints={["pin14"]}
            pcbX="0.250063mm"
            pcbY="1.499997mm"
            width="0.2800096mm"
            height="0.850011mm"
            radius="0.1400048mm"
            shape="pill"
          />
          <smtpad
            portHints={["pin15"]}
            pcbX="-0.249809mm"
            pcbY="1.499997mm"
            width="0.2800096mm"
            height="0.850011mm"
            radius="0.1400048mm"
            shape="pill"
          />
          <smtpad
            portHints={["pin16"]}
            pcbX="-0.749935mm"
            pcbY="1.499997mm"
            width="0.2800096mm"
            height="0.850011mm"
            radius="0.1400048mm"
            shape="pill"
          />
          <smtpad
            portHints={["pin17"]}
            points={[
              { x: "0.8501126mm", y: "0.8501126mm" },
              { x: "0.8501126mm", y: "-0.849884mm" },
              { x: "-0.849884mm", y: "-0.849884mm" },
              { x: "-0.849884mm", y: "0.4251198mm" },
              { x: "-0.4248658mm", y: "0.850138mm" },
            ]}
            shape="polygon"
          />
          <courtyardoutline
            outline={[
              { x: -2.175002499999998, y: 2.175002499999998 },
              { x: 2.175002499999991, y: 2.175002499999998 },
              { x: 2.175002499999991, y: -2.175002499999998 },
              { x: -2.175002499999998, y: -2.175002499999998 },
              { x: -2.175002499999998, y: 2.175002499999998 },
            ]}
          />
        </footprint>
      }
      {...props}
    />
  )
}
