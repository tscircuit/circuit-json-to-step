import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["EH2"],
  pin2: ["EH1"],
  pin3: ["EH4"],
  pin4: ["EH3"],
  pin5: ["SBU2", "B8"],
  pin6: ["CC1", "A5"],
  pin7: ["DN2", "B7"],
  pin8: ["DP1", "A6"],
  pin9: ["DN1", "A7"],
  pin10: ["DP2", "B6"],
  pin11: ["SBU1", "A8"],
  pin12: ["CC2", "B5"],
  pin13: ["GND1", "A1B12"],
  pin14: ["GND2", "B1A12"],
  pin15: ["VBUS1", "B4A9"],
  pin16: ["VBUS2", "A4B9"],
} as const

const pinAttributes = {
  pin5: { isPassive: true },
  pin6: { isPassive: true },
  pin7: { isPassive: true },
  pin8: { isPassive: true },
  pin9: { isPassive: true },
  pin10: { isPassive: true },
  pin11: { isPassive: true },
  pin12: { isPassive: true },
} satisfies NonNullable<ChipProps["pinAttributes"]>

export const TYPE_C_31_M_12 = (props: ChipProps<typeof pinLabels>) => {
  return (
    <connector
      isSmt={false}
      pinLabels={pinLabels}
      pinAttributes={pinAttributes}
      supplierPartNumbers={{
        jlcpcb: ["C165948"],
      }}
      manufacturerPartNumber="TYPE-C-31-M-12"
      footprint={
        <footprint insertionDirection="from_bottom">
          <hole pcbX="-2.899918mm" pcbY="0.9055672mm" diameter="0.5999988mm" />
          <hole pcbX="2.899918mm" pcbY="0.9055672mm" diameter="0.5999988mm" />
          <platedhole
            portHints={["pin2"]}
            pcbX="4.325112mm"
            pcbY="-2.7741308mm"
            holeWidth="0.7999984mm"
            holeHeight="1.1999976mm"
            outerWidth="1.1999976mm"
            outerHeight="1.7999964mm"
            shape="pill"
          />
          <platedhole
            portHints={["pin1"]}
            pcbX="4.325112mm"
            pcbY="1.4056932mm"
            holeWidth="0.7999984mm"
            holeHeight="1.499997mm"
            outerWidth="1.1999976mm"
            outerHeight="1.999996mm"
            shape="pill"
          />
          <platedhole
            portHints={["pin4"]}
            pcbX="-4.325112mm"
            pcbY="1.4056932mm"
            holeWidth="0.7999984mm"
            holeHeight="1.499997mm"
            outerWidth="1.1999976mm"
            outerHeight="1.999996mm"
            shape="pill"
          />
          <platedhole
            portHints={["pin3"]}
            pcbX="-4.325112mm"
            pcbY="-2.7741308mm"
            holeWidth="0.7999984mm"
            holeHeight="1.1999976mm"
            outerWidth="1.1999976mm"
            outerHeight="1.7999964mm"
            shape="pill"
          />
          <smtpad
            portHints={["pin5"]}
            pcbX="-1.75006mm"
            pcbY="2.1740432mm"
            width="0.2999994mm"
            height="1.2999974mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin6"]}
            pcbX="-1.249934mm"
            pcbY="2.1740432mm"
            width="0.2999994mm"
            height="1.2999974mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin7"]}
            pcbX="-0.750062mm"
            pcbY="2.1740432mm"
            width="0.2999994mm"
            height="1.2999974mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin8"]}
            pcbX="-0.249936mm"
            pcbY="2.1740432mm"
            width="0.2999994mm"
            height="1.2999974mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin9"]}
            pcbX="0.249936mm"
            pcbY="2.1740432mm"
            width="0.2999994mm"
            height="1.2999974mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin10"]}
            pcbX="0.750062mm"
            pcbY="2.1740432mm"
            width="0.2999994mm"
            height="1.2999974mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin11"]}
            pcbX="1.24968mm"
            pcbY="2.1740432mm"
            width="0.2999994mm"
            height="1.2999974mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin12"]}
            pcbX="1.75006mm"
            pcbY="2.1740432mm"
            width="0.2999994mm"
            height="1.2999974mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin13"]}
            points={[
              { x: "-2.8999688mm", y: "1.524108mm" },
              { x: "-2.8999688mm", y: "2.8241308mm" },
              { x: "-2.8999688mm", y: "2.8241308mm" },
              { x: "-3.1999682mm", y: "2.8241308mm" },
              { x: "-3.1999682mm", y: "2.8241308mm" },
              { x: "-3.1999682mm", y: "2.8239784mm" },
              { x: "-3.1999682mm", y: "2.8239784mm" },
              { x: "-3.4999422mm", y: "2.8239784mm" },
              { x: "-3.4999422mm", y: "2.8239784mm" },
              { x: "-3.4999422mm", y: "1.5239556mm" },
              { x: "-3.4999422mm", y: "1.5239556mm" },
              { x: "-3.1999428mm", y: "1.5239556mm" },
              { x: "-3.1999428mm", y: "1.5239556mm" },
              { x: "-3.1999428mm", y: "1.524108mm" },
              { x: "-3.1999428mm", y: "1.524108mm" },
              { x: "-2.8999688mm", y: "1.524108mm" },
            ]}
            shape="polygon"
          />
          <smtpad
            portHints={["pin14"]}
            points={[
              { x: "2.8999942mm", y: "2.8241308mm" },
              { x: "2.8999942mm", y: "1.5241588mm" },
              { x: "2.8999942mm", y: "1.5241588mm" },
              { x: "3.1999936mm", y: "1.5241588mm" },
              { x: "3.1999936mm", y: "1.5241588mm" },
              { x: "3.200019mm", y: "1.5241588mm" },
              { x: "3.200019mm", y: "1.5241588mm" },
              { x: "3.5000184mm", y: "1.5241588mm" },
              { x: "3.5000184mm", y: "1.5241588mm" },
              { x: "3.5000184mm", y: "2.8241308mm" },
              { x: "3.5000184mm", y: "2.8241308mm" },
              { x: "3.200019mm", y: "2.8241308mm" },
              { x: "3.200019mm", y: "2.8241308mm" },
              { x: "3.1999936mm", y: "2.8241308mm" },
              { x: "3.1999936mm", y: "2.8241308mm" },
              { x: "2.8999942mm", y: "2.8241308mm" },
            ]}
            shape="polygon"
          />
          <smtpad
            portHints={["pin15"]}
            points={[
              { x: "2.7001724mm", y: "1.5241588mm" },
              { x: "2.7001724mm", y: "2.8241308mm" },
              { x: "2.7001724mm", y: "2.8241308mm" },
              { x: "2.400173mm", y: "2.8241308mm" },
              { x: "2.400173mm", y: "2.8241308mm" },
              { x: "2.4001476mm", y: "2.8241308mm" },
              { x: "2.4001476mm", y: "2.8241308mm" },
              { x: "2.1001482mm", y: "2.8241308mm" },
              { x: "2.1001482mm", y: "2.8241308mm" },
              { x: "2.1001482mm", y: "1.5241588mm" },
              { x: "2.1001482mm", y: "1.5241588mm" },
              { x: "2.4001476mm", y: "1.5241588mm" },
              { x: "2.4001476mm", y: "1.5241588mm" },
              { x: "2.400173mm", y: "1.5241588mm" },
              { x: "2.400173mm", y: "1.5241588mm" },
              { x: "2.7001724mm", y: "1.5241588mm" },
            ]}
            shape="polygon"
          />
          <smtpad
            portHints={["pin16"]}
            points={[
              { x: "-2.0999704mm", y: "1.5240064mm" },
              { x: "-2.0999704mm", y: "2.8239784mm" },
              { x: "-2.0999704mm", y: "2.8239784mm" },
              { x: "-2.3999952mm", y: "2.8239784mm" },
              { x: "-2.3999952mm", y: "2.8239784mm" },
              { x: "-2.3999952mm", y: "2.823953mm" },
              { x: "-2.3999952mm", y: "2.823953mm" },
              { x: "-2.6999438mm", y: "2.823953mm" },
              { x: "-2.6999438mm", y: "2.823953mm" },
              { x: "-2.6999438mm", y: "1.523981mm" },
              { x: "-2.6999438mm", y: "1.523981mm" },
              { x: "-2.399919mm", y: "1.523981mm" },
              { x: "-2.399919mm", y: "1.523981mm" },
              { x: "-2.399919mm", y: "1.5240064mm" },
              { x: "-2.399919mm", y: "1.5240064mm" },
              { x: "-2.0999704mm", y: "1.5240064mm" },
            ]}
            shape="polygon"
          />
          <courtyardoutline
            outline={[
              { x: -5.17511079999997, y: 3.074130799999921 },
              { x: 5.17511079999997, y: 3.074130799999921 },
              { x: 5.17511079999997, y: -5.60002099999997 },
              { x: -5.17511079999997, y: -5.60002099999997 },
              { x: -5.17511079999997, y: 3.074130799999921 },
            ]}
          />
          {/* Explicit paste on the 12 SMT contacts only. Shell slots are hand/selectively soldered. */}
          <solderpaste
            shape="rect"
            pcbX={-1.75006}
            pcbY={2.174043}
            width={0.21}
            height={0.909998}
            layer="top"
          />
          <solderpaste
            shape="rect"
            pcbX={-1.249934}
            pcbY={2.174043}
            width={0.21}
            height={0.909998}
            layer="top"
          />
          <solderpaste
            shape="rect"
            pcbX={-0.750062}
            pcbY={2.174043}
            width={0.21}
            height={0.909998}
            layer="top"
          />
          <solderpaste
            shape="rect"
            pcbX={-0.249936}
            pcbY={2.174043}
            width={0.21}
            height={0.909998}
            layer="top"
          />
          <solderpaste
            shape="rect"
            pcbX={0.249936}
            pcbY={2.174043}
            width={0.21}
            height={0.909998}
            layer="top"
          />
          <solderpaste
            shape="rect"
            pcbX={0.750062}
            pcbY={2.174043}
            width={0.21}
            height={0.909998}
            layer="top"
          />
          <solderpaste
            shape="rect"
            pcbX={1.24968}
            pcbY={2.174043}
            width={0.21}
            height={0.909998}
            layer="top"
          />
          <solderpaste
            shape="rect"
            pcbX={1.75006}
            pcbY={2.174043}
            width={0.21}
            height={0.909998}
            layer="top"
          />
          <solderpaste
            shape="rect"
            pcbX={-3.199955}
            pcbY={2.174043}
            width={0.42}
            height={0.9}
            layer="top"
          />
          <solderpaste
            shape="rect"
            pcbX={3.200006}
            pcbY={2.174145}
            width={0.42}
            height={0.9}
            layer="top"
          />
          <solderpaste
            shape="rect"
            pcbX={2.40016}
            pcbY={2.174145}
            width={0.42}
            height={0.9}
            layer="top"
          />
          <solderpaste
            shape="rect"
            pcbX={-2.399957}
            pcbY={2.17398}
            width={0.42}
            height={0.9}
            layer="top"
          />
        </footprint>
      }
      {...props}
    />
  )
}
