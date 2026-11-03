import type {
  CapacitorProps,
  ChipProps,
  ConnectorProps,
  InductorProps,
  LedProps,
  PushButtonProps,
  ResistorProps,
} from "@tscircuit/props"

// Full circuit from https://tscircuit.com/gokul/lora-device (v0.1.6).
// Component CAD meshes and unused autorouter caches are omitted for this repro.

export default function IndiaLoRaTracker() {
  return (
    <board
      title="lora-device"
      width={50}
      height={78}
      thickness={1.6}
      layers={4}
      doubleSidedAssembly
      autorouter={{ preset: "auto_local", traceClearance: 0.2 }}
      autorouterVersion="beta_pipeline9"
      routeRemaining={false}
      autorouterEffortLevel="5x"
      minTraceWidth={0.2}
      defaultTraceWidth={0.2}
      minTraceToPadEdgeClearance={0.15}
      minViaEdgeToPadEdgeClearance={0.25}
      minPadEdgeToPadEdgeClearance={0.15}
      minViaHoleEdgeToViaHoleEdgeClearance={0.2}
      minPlatedHoleDrillEdgeToDrillEdgeClearance={0.45}
      minViaHoleDiameter={0.3}
      minViaPadDiameter={0.6}
      pcbStyle={{ viaPadDiameter: 0.6, viaHoleDiameter: 0.3 }}
      minBoardEdgeClearance={0.3}
      allowBlindAndBuriedVias={false}
      defaultViaTenting="both_sides"
      schAutoLayoutEnabled
      schTraceAutoLabelEnabled
      schMaxTraceDistance={2}
    >
      <net name="GND" isGroundNet routingPhaseIndex={0} />
      <net
        name="VBUS"
        routingPhaseIndex={0}
        isPowerNet
        nominalTraceWidth={0.5}
      />
      <net
        name="VBAT"
        routingPhaseIndex={0}
        isPowerNet
        nominalTraceWidth={0.6}
      />
      <net
        name="VSYS"
        routingPhaseIndex={0}
        isPowerNet
        nominalTraceWidth={0.4}
      />
      <net
        name="V3_3"
        routingPhaseIndex={0}
        isPowerNet
        nominalTraceWidth={0.5}
      />
      <net name="SW_L1" nominalTraceWidth={0.5} />
      <net name="SW_L2" nominalTraceWidth={0.5} />
      <net
        name="GPS_3V3"
        routingPhaseIndex={0}
        isPowerNet
        nominalTraceWidth={0.3}
      />
      <net name="CC1" routingPhaseIndex={0} />
      <net name="CC2" routingPhaseIndex={0} />
      <net name="USB_DP" routingPhaseIndex={0} />
      <net name="USB_DM" routingPhaseIndex={0} />
      <net name="BAT_TEMP" routingPhaseIndex={0} />
      <net name="USB_500MA" routingPhaseIndex={0} />
      <net name="USB_PGOOD" routingPhaseIndex={0} />
      <net name="CHARGE_LED" routingPhaseIndex={0} />
      <net name="CHARGER_ILIM" routingPhaseIndex={0} />
      <net name="CHARGER_ISET" routingPhaseIndex={0} />
      <net name="POWER_LED" routingPhaseIndex={0} />
      <net name="CHARGE_LED_A" routingPhaseIndex={0} />
      <net name="MCU_EN" routingPhaseIndex={0} />
      <net name="BOOT" routingPhaseIndex={0} />
      <net name="LORA_NSS" routingPhaseIndex={0} />
      <net name="LORA_MOSI" routingPhaseIndex={0} />
      <net name="LORA_SCK" routingPhaseIndex={0} />
      <net name="LORA_MISO" routingPhaseIndex={0} />
      <net name="LORA_BUSY" routingPhaseIndex={0} />
      <net name="LORA_IRQ" routingPhaseIndex={0} />
      <net name="LORA_RESET" routingPhaseIndex={0} />
      <net name="GPS_ENABLE" routingPhaseIndex={0} />
      <net name="GPS_UART_RX" routingPhaseIndex={0} />
      <net name="GPS_UART_TX" routingPhaseIndex={0} />
      <net name="USER_BUTTON" routingPhaseIndex={0} />
      <net name="STATUS_LED" routingPhaseIndex={0} />
      <net name="BAT_SENSE" routingPhaseIndex={0} />
      <net name="DEBUG_TX" routingPhaseIndex={0} />
      <net name="DEBUG_RX" routingPhaseIndex={0} />
      <net name="STATUS_LED_A" routingPhaseIndex={0} />
      <net name="GPS_RX" routingPhaseIndex={0} />
      <net name="GPS_TX" routingPhaseIndex={0} />
      <group name="GroundPlane">
        <copperpour
          name="GroundReference"
          layer="inner1"
          connectsTo="net.GND"
          clearance={0.2}
          boardEdgeMargin={0.3}
        />
      </group>
      <UsbRouting />
      <BoardLegend />
      {/* Give the USB locating holes 0.25 mm copper clearance, including polygon approximation. */}
      <keepout
        shape="rect"
        pcbX={15.100082}
        pcbY={-34.0944328}
        width={1.1}
        height={1.1}
        layers={["top", "inner1", "inner2", "bottom"]}
        excludeRefs={[".J1"]}
      />
      <keepout
        shape="rect"
        pcbX={20.899918}
        pcbY={-34.0944328}
        width={1.1}
        height={1.1}
        layers={["top", "inner1", "inner2", "bottom"]}
        excludeRefs={[".J1"]}
      />
      <group
        name="TrackerSchematic"
        pcbX={0}
        pcbY={0}
        pcbRelative
        schAutoLayoutEnabled
      >
        <PowerSection />
        <ControllerSection />
        <RadioGnssSection />
      </group>
      <schematicsection name="Usb" displayName="USB-C and protection" />
      <schematicsection name="Charger" displayName="LiPo" />
      <schematicsection name="Regulator" displayName="3.3 V regulator" />
      <schematicsection
        name="PowerIndicators"
        displayName="Power and charge LEDs"
      />
      <schematicsection name="Mcu" displayName="ESP32 controller" />
      <schematicsection name="Controls" displayName="Buttons" />
      <schematicsection name="LinkLed" displayName="Link LED" />
      <schematicsection name="Debug" displayName="Debug pads" />
      <schematicsection name="BatteryMonitor" displayName="Battery monitor" />
      <schematicsection name="LoRa" displayName="LoRa radio" />
      <schematicsection name="GnssPower" displayName="GNSS power and UART" />
      <schematicsection name="GnssReceiver" displayName="GNSS receiver" />
      <copperpour
        name="GnssTopReference"
        layer="top"
        connectsTo="net.GND"
        unbroken
        outline={[
          { x: -5.5, y: 10.5 },
          { x: 5.5, y: 10.5 },
          { x: 5.5, y: 21.5 },
          { x: -5.5, y: 21.5 },
        ]}
        clearance={0.2}
      />
      <copperpour
        name="BottomGround"
        layer="bottom"
        connectsTo="net.GND"
        clearance={0.2}
        boardEdgeMargin={0.3}
      />
      <copperpour
        name="TopGround"
        layer="top"
        connectsTo="net.GND"
        clearance={0.2}
        boardEdgeMargin={0.3}
      />
      <keepout
        shape="rect"
        pcbX={-6.5}
        pcbY={-35}
        width={37}
        height={8}
        layers={["top", "inner1", "inner2", "bottom"]}
        excludeRefs={[".U1"]}
      />
      <copperpour
        name="GnssInner1Ground"
        layer="inner1"
        connectsTo="net.GND"
        unbroken
        outline={[
          { x: -8, y: 8 },
          { x: 8, y: 8 },
          { x: 8, y: 24 },
          { x: -8, y: 24 },
        ]}
        clearance={0.2}
      />
      <copperpour
        name="GnssInnerGround"
        layer="inner2"
        connectsTo="net.GND"
        unbroken
        outline={[
          { x: -8, y: 8 },
          { x: 8, y: 8 },
          { x: 8, y: 24 },
          { x: -8, y: 24 },
        ]}
        clearance={0.2}
      />
      <copperpour
        name="GnssBottomGround"
        layer="bottom"
        connectsTo="net.GND"
        unbroken
        outline={[
          { x: -8, y: 8 },
          { x: 8, y: 8 },
          { x: 8, y: 24 },
          { x: -8, y: 24 },
        ]}
        clearance={0.2}
      />
      <via
        name="GndStitch1"
        connectsTo="net.GND"
        pcbX={3.5}
        pcbY={-21}
        outerDiameter={0.6}
        holeDiameter={0.3}
        layers={["top", "bottom"]}
      />
      <via
        name="GndStitch2"
        connectsTo="net.GND"
        pcbX={8.5}
        pcbY={-21}
        outerDiameter={0.6}
        holeDiameter={0.3}
        layers={["top", "bottom"]}
      />
      <via
        name="GndStitch3"
        connectsTo="net.GND"
        pcbX={23}
        pcbY={-21}
        outerDiameter={0.6}
        holeDiameter={0.3}
        layers={["top", "bottom"]}
      />
      <via
        name="GndStitch4"
        connectsTo="net.GND"
        pcbX={20}
        pcbY={-24}
        outerDiameter={0.6}
        holeDiameter={0.3}
        layers={["top", "bottom"]}
      />
      <via
        name="GndStitch5"
        connectsTo="net.GND"
        pcbX={-22}
        pcbY={8}
        outerDiameter={0.6}
        holeDiameter={0.3}
        layers={["top", "bottom"]}
      />
      <via
        name="GndStitch6"
        connectsTo="net.GND"
        pcbX={-22}
        pcbY={22}
        outerDiameter={0.6}
        holeDiameter={0.3}
        layers={["top", "bottom"]}
      />
      <via
        name="GndStitch7"
        connectsTo="net.GND"
        pcbX={-22}
        pcbY={35}
        outerDiameter={0.6}
        holeDiameter={0.3}
        layers={["top", "bottom"]}
      />
      <via
        name="GndStitch8"
        connectsTo="net.GND"
        pcbX={22}
        pcbY={8}
        outerDiameter={0.6}
        holeDiameter={0.3}
        layers={["top", "bottom"]}
      />
      <via
        name="GndStitch9"
        connectsTo="net.GND"
        pcbX={22}
        pcbY={22}
        outerDiameter={0.6}
        holeDiameter={0.3}
        layers={["top", "bottom"]}
      />
      <via
        name="GndStitch10"
        connectsTo="net.GND"
        pcbX={22}
        pcbY={35}
        outerDiameter={0.6}
        holeDiameter={0.3}
        layers={["top", "bottom"]}
      />
      <via
        name="GndStitch11"
        connectsTo="net.GND"
        pcbX={-10}
        pcbY={35}
        outerDiameter={0.6}
        holeDiameter={0.3}
        layers={["top", "bottom"]}
      />
      <via
        name="GndStitch12"
        connectsTo="net.GND"
        pcbX={10}
        pcbY={35}
        outerDiameter={0.6}
        holeDiameter={0.3}
        layers={["top", "bottom"]}
      />
      <keepout
        shape="rect"
        pcbX={-24.8}
        pcbY={0}
        width={0.4}
        height={78}
        layers={["top", "inner1", "inner2", "bottom"]}
      />
      <keepout
        shape="rect"
        pcbX={24.8}
        pcbY={0}
        width={0.4}
        height={78}
        layers={["top", "inner1", "inner2", "bottom"]}
      />
      <keepout
        shape="rect"
        pcbX={0}
        pcbY={38.8}
        width={50}
        height={0.4}
        layers={["top", "inner1", "inner2", "bottom"]}
      />
      <keepout
        shape="rect"
        pcbX={0}
        pcbY={-38.8}
        width={50}
        height={0.4}
        layers={["top", "inner1", "inner2", "bottom"]}
        excludeRefs={[".J1"]}
      />
    </board>
  )
}

function PowerSection() {
  return (
    <>
      <TYPE_C_31_M_12
        schSectionName="Usb"
        name="J1"
        allowOffBoard
        pcbX={18}
        pcbY={-35}
        pcbRotation={0}
        connections={{
          VBUS1: "net.VBUS",
          VBUS2: "net.VBUS",
          GND1: "net.GND",
          GND2: "net.GND",
          EH1: "net.GND",
          EH2: "net.GND",
          EH3: "net.GND",
          EH4: "net.GND",
          CC1: "net.CC1",
          CC2: "net.CC2",
          DP1: "net.USB_DP",
          DP2: "net.USB_DP",
          DN1: "net.USB_DM",
          DN2: "net.USB_DM",
        }}
        noConnect={["SBU1", "SBU2"]}
      />
      <R
        schSectionName="Usb"
        name="R1"
        pcbRotation={180}
        resistance="5.1k"
        pcbX={10.5}
        pcbY={-30}
        connections={{ pin1: "net.CC1", pin2: "net.GND" }}
      />
      <R
        schSectionName="Usb"
        name="R2"
        pcbRotation={180}
        resistance="5.1k"
        pcbX={10.5}
        pcbY={-28.4}
        connections={{ pin1: "net.CC2", pin2: "net.GND" }}
      />

      <USBLC6_2SC6
        schSectionName="Usb"
        name="U6"
        displayName="U6 USB ESD / 5 V"
        pcbX={18}
        pcbY={-28.5}
        internallyConnectedPins={[
          ["pin1", "pin6"],
          ["pin3", "pin4"],
        ]}
        connections={{
          pin1: "net.USB_DP",
          pin6: "net.USB_DP",
          pin3: "net.USB_DM",
          pin4: "net.USB_DM",
          pin2: "net.GND",
          pin5: "net.VBUS",
        }}
      />

      <C
        schSectionName="Usb"
        name="C1"
        capacitance="100nF"
        pcbX={22}
        pcbY={-28.5}
        connections={{ pin1: "net.VBUS", pin2: "net.GND" }}
      />
      <C
        schSectionName="Usb"
        name="C2"
        pcbRotation={90}
        capacitance="1uF"
        pcbX={20.75}
        pcbY={-17}
        connections={{ pin1: "net.VBUS", pin2: "net.GND" }}
      />

      <BQ24074RGTR
        schSectionName="Charger"
        name="U2"
        pcbRotation={0}
        displayName="U2 Charger / 250 mA"
        pcbX={20}
        pcbY={-21}
        noConnect={["TMR", "ITERM"]}
        internallyConnectedPins={[
          ["BAT1", "BAT2"],
          ["OUT1", "OUT2"],
          ["VSS", "EP"],
        ]}
        connections={{
          TS: "net.BAT_TEMP",
          BAT1: "net.VBAT",
          BAT2: "net.VBAT",
          N_CE: "net.GND",
          EN2: "net.GND",
          EN1: "net.USB_500MA",
          N_PGOOD: "net.USB_PGOOD",
          VSS: "net.GND",
          N_CHG: "net.CHARGE_LED",
          OUT1: "net.VSYS",
          OUT2: "net.VSYS",
          ILIM: "net.CHARGER_ILIM",
          IN: "net.VBUS",
          ISET: "net.CHARGER_ISET",
          EP: "net.GND",
        }}
      />
      <R
        schSectionName="Charger"
        name="R3"
        pcbRotation={0}
        resistance="3.57k"
        pcbX={16}
        pcbY={-16.5}
        connections={{ pin1: "net.CHARGER_ISET", pin2: "net.GND" }}
      />
      <R
        schSectionName="Charger"
        name="R4"
        pcbRotation={0}
        resistance="3.24k"
        pcbX={23}
        pcbY={-17}
        connections={{ pin1: "net.CHARGER_ILIM", pin2: "net.GND" }}
      />
      <R
        schSectionName="Charger"
        name="R5"
        resistance="10k"
        pcbX={14}
        pcbY={-27}
        connections={{ pin1: "net.V3_3", pin2: "net.USB_500MA" }}
      />
      <R
        schSectionName="Charger"
        name="R6"
        resistance="10k"
        pcbX={12}
        pcbY={-16.5}
        connections={{ pin1: "net.V3_3", pin2: "net.USB_PGOOD" }}
      />
      <C
        schSectionName="Charger"
        name="C3"
        pcbRotation={180}
        capacitance="10uF"
        footprint="0805"
        pcbX={16}
        pcbY={-21}
        connections={{ pin1: "net.VBAT", pin2: "net.GND" }}
      />
      <C
        schSectionName="Charger"
        name="C4"
        schMarginX={0.6}
        schMarginY={0.6}
        capacitance="10uF"
        footprint="0805"
        pcbX={23.2}
        pcbY={-24}
        pcbRotation={270}
        connections={{ pin1: "net.VSYS", pin2: "net.GND" }}
      />
      <BatteryConnector
        schSectionName="Charger"
        name="J2"
        manufacturerPartNumber="B3B-PH-K-S(LF)(SN)"
        supplierPartNumbers={{ jlcpcb: ["C131339"] }}
        pcbX={-21}
        pcbY={-7.5}
        connections={{
          pin1: "net.VBAT",
          pin2: "net.GND",
          pin3: "net.BAT_TEMP",
        }}
      />

      <TPS63021DSJR
        schSectionName="Regulator"
        name="U3"
        pcbRotation={0}
        displayName="U3 Buck-boost / 3.3 V"
        pcbX={6}
        pcbY={-21}
        internallyConnectedPins={[
          ["VIN1", "VIN2"],
          ["VOUT1", "VOUT2"],
          ["L11", "L12"],
          ["L21", "L22"],
          ["GND", "PGND"],
        ]}
        noConnect={["PG"]}
        connections={{
          VINA: "net.VSYS",
          GND: "net.GND",
          FB: "net.V3_3",
          VOUT1: "net.V3_3",
          VOUT2: "net.V3_3",
          L21: "net.SW_L2",
          L22: "net.SW_L2",
          L11: "net.SW_L1",
          L12: "net.SW_L1",
          VIN1: "net.VSYS",
          VIN2: "net.VSYS",
          EN: "net.VSYS",
          PS: "net.GND",
          PGND: "net.GND",
        }}
      />
      <InductorFootprint
        schSectionName="Regulator"
        name="L1"
        pcbRotation={270}
        manufacturerPartNumber="XFL4020-152MEC"
        pcbX={11.1}
        pcbY={-21}
        connections={{ pin1: "net.SW_L1", pin2: "net.SW_L2" }}
      />

      <C
        schSectionName="Regulator"
        name="C5"
        capacitance="10uF"
        footprint="0805"
        pcbX={5}
        pcbY={-16.5}
        pcbRotation={90}
        connections={{ pin1: "net.VSYS", pin2: "net.GND" }}
      />
      <C
        schSectionName="Regulator"
        name="C6"
        capacitance="10uF"
        footprint="0805"
        pcbX={8}
        pcbY={-16.5}
        pcbRotation={90}
        connections={{ pin1: "net.VSYS", pin2: "net.GND" }}
      />
      <C
        schSectionName="Regulator"
        name="C7"
        pcbRotation={180}
        capacitance="100nF"
        pcbX={1.9}
        pcbY={-22.5}
        connections={{ pin1: "net.VSYS", pin2: "net.GND" }}
      />

      <C
        schSectionName="Regulator"
        name="C8"
        capacitance="22uF"
        footprint="0805"
        pcbX={4}
        pcbY={-25.7}
        pcbRotation={270}
        connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
      />
      <C
        schSectionName="Regulator"
        name="C9"
        capacitance="22uF"
        footprint="0805"
        pcbX={7}
        pcbY={-25.7}
        pcbRotation={270}
        connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
      />
      <C
        schSectionName="Regulator"
        name="C10"
        capacitance="22uF"
        footprint="0805"
        pcbX={10}
        pcbY={-25.7}
        pcbRotation={270}
        connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
      />

      <R
        schSectionName="PowerIndicators"
        name="R7"
        resistance="2.2k"
        pcbX={11}
        pcbY={-2.5}
        connections={{ pin1: "net.V3_3", pin2: "net.POWER_LED" }}
      />
      <R
        schSectionName="PowerIndicators"
        name="R8"
        resistance="2.2k"
        pcbRotation={180}
        pcbX={15}
        pcbY={-2.5}
        connections={{ pin1: "net.VBUS", pin2: "net.CHARGE_LED_A" }}
      />
      <LTST_C190KGKT
        schSectionName="PowerIndicators"
        name="D1"
        schOrientation="pos_top"
        color="green"
        pcbX={11}
        pcbY={-5.5}
        connections={{ anode: "net.POWER_LED", cathode: "net.GND" }}
      />
      <LTST_C190KFKT
        schSectionName="PowerIndicators"
        name="D2"
        schOrientation="pos_top"
        color="orange"
        pcbX={15}
        pcbY={-5.5}
        connections={{ anode: "net.CHARGE_LED_A", cathode: "net.CHARGE_LED" }}
      />
      <trace
        name="SwitchL1Bridge"
        from=".U3 > .L12"
        to=".U3 > .L11"
        thickness={0.3}
        pcbPath={[".U3 > .L12", ".U3 > .L11"]}
      />
      <trace
        name="SwitchL2Bridge"
        from=".U3 > .L22"
        to=".U3 > .L21"
        thickness={0.3}
        pcbPath={[".U3 > .L22", ".U3 > .L21"]}
      />
      <trace
        name="SwitchL1Path"
        from=".U3 > .L11"
        to=".L1 > .pin1"
        thickness={0.4}
        pcbPath={[
          ".U3 > .L11",
          { x: 2.5, y: 1.450086 },
          { x: 2.765086, y: 1.185 },
          ".L1 > .pin1",
        ]}
      />
      <trace
        name="SwitchL2Path"
        from=".U3 > .L21"
        to=".L1 > .pin2"
        thickness={0.4}
        pcbPath={[
          ".U3 > .L21",
          { x: 2.5, y: -1.450086 },
          { x: 2.765086, y: -1.185 },
          ".L1 > .pin2",
        ]}
      />
    </>
  )
}

function ControllerSection() {
  return (
    <>
      <ESP32_S3_WROOM_1_N8
        schSectionName="Mcu"
        name="U1"
        displayName="U1 MCU / 3.3 V"
        pcbX={-12}
        pcbY={-21.5}
        pcbRotation={180}
        internallyConnectedPins={[["GND1", "GND2", "EP"]]}
        noConnect={[
          "IO3",
          "IO46",
          "IO45",
          "IO35",
          "IO36",
          "IO37",
          "IO38",
          "IO39",
          "IO40",
          "IO41",
          "IO42",
          "IO2",
          "IO8",
          "IO9",
          "IO14",
          "IO18",
        ]}
        connections={{
          GND1: "net.GND",
          GND2: "net.GND",
          EP: "net.GND",
          "3V3": "net.V3_3",
          EN: "net.MCU_EN",
          IO0: "net.BOOT",
          IO19: "net.MCU_USB_DM",
          IO20: "net.MCU_USB_DP",
          IO10: "net.LORA_NSS",
          IO11: "net.LORA_MOSI",
          IO12: "net.LORA_SCK",
          IO13: "net.LORA_MISO",
          IO4: "net.LORA_BUSY",
          IO5: "net.LORA_IRQ",
          IO6: "net.LORA_RESET",
          IO7: "net.GPS_ENABLE",
          IO15: "net.GPS_UART_RX",
          IO16: "net.GPS_UART_TX",
          IO17: "net.USER_BUTTON",
          IO48: "net.STATUS_LED",
          IO21: "net.USB_500MA",
          IO47: "net.USB_PGOOD",
          IO1: "net.BAT_SENSE",
          TXD0: "net.DEBUG_TX",
          RXD0: "net.DEBUG_RX",
        }}
      />
      <R
        schSectionName="Mcu"
        name="R9"
        resistance="10k"
        pcbX={3.5}
        pcbY={-28.2}
        connections={{ pin1: "net.V3_3", pin2: "net.MCU_EN" }}
      />
      <C
        schSectionName="Mcu"
        name="C11"
        capacitance="1uF"
        pcbRotation={180}
        pcbX={3.5}
        pcbY={-30}
        connections={{ pin1: "net.MCU_EN", pin2: "net.GND" }}
      />
      <R
        schSectionName="Mcu"
        name="R10"
        resistance="10k"
        pcbX={-22}
        pcbY={-12}
        layer="bottom"
        connections={{ pin1: "net.V3_3", pin2: "net.BOOT" }}
      />
      <R
        schSectionName="Mcu"
        name="R11"
        schMarginLeft={1}
        schMarginRight={1}
        resistance="22"
        pcbX={0}
        pcbY={-15.45}
        pcbRotation={0}
        connections={{ pin1: "net.MCU_USB_DM", pin2: "net.USB_DM" }}
      />
      <R
        schSectionName="Mcu"
        name="R12"
        resistance="22"
        pcbX={0}
        pcbY={-13.95}
        pcbRotation={0}
        connections={{ pin1: "net.MCU_USB_DP", pin2: "net.USB_DP" }}
      />

      <C
        schSectionName="Mcu"
        name="C12"
        capacitance="10uF"
        footprint="0805"
        pcbX={0}
        pcbY={-27.8}
        connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
      />
      <C
        schSectionName="Mcu"
        name="C13"
        capacitance="100nF"
        pcbX={0}
        pcbY={-30}
        connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
      />

      <TS_1088_AR02016
        schSectionName="Controls"
        schRotation={-90}
        name="SW1"
        pcbX={-11}
        pcbY={-6.5}
        connections={{ pin1: "net.MCU_EN", pin2: "net.GND" }}
      />
      <TS_1088_AR02016
        schSectionName="Controls"
        schRotation={-90}
        name="SW2"
        pcbX={-3}
        pcbY={-6.5}
        connections={{ pin1: "net.BOOT", pin2: "net.GND" }}
      />
      <TS_1088_AR02016
        schSectionName="Controls"
        schRotation={-90}
        name="SW3"
        pcbX={5}
        pcbY={-6.5}
        connections={{ pin1: "net.USER_BUTTON", pin2: "net.GND" }}
      />
      <R
        schSectionName="Controls"
        name="R13"
        resistance="10k"
        pcbRotation={180}
        pcbX={5}
        pcbY={-11.5}
        connections={{ pin1: "net.V3_3", pin2: "net.USER_BUTTON" }}
      />

      <R
        schSectionName="LinkLed"
        name="R14"
        resistance="2.2k"
        pcbX={19}
        pcbY={-2.5}
        connections={{ pin1: "net.STATUS_LED", pin2: "net.STATUS_LED_A" }}
      />
      <LTST_C190TBKT
        schSectionName="LinkLed"
        name="D3"
        schOrientation="pos_top"
        color="blue"
        pcbX={19}
        pcbY={-5.5}
        connections={{ anode: "net.STATUS_LED_A", cathode: "net.GND" }}
      />

      <testpoint
        isSmt={false}
        pcbStyle={{ silkscreenTextVisibility: "hidden" }}
        schSectionName="Debug"
        name="TP1"
        doNotPlace
        footprintVariant="pad"
        padDiameter={1.2}
        pcbX={20}
        pcbY={-4}
        connections={{ pin1: "net.DEBUG_TX" }}
      />
      <testpoint
        isSmt={false}
        pcbStyle={{ silkscreenTextVisibility: "hidden" }}
        schSectionName="Debug"
        name="TP2"
        doNotPlace
        footprintVariant="pad"
        padDiameter={1.2}
        pcbX={23}
        pcbY={-4}
        connections={{ pin1: "net.DEBUG_RX" }}
      />
      <testpoint
        isSmt={false}
        pcbStyle={{ silkscreenTextVisibility: "hidden" }}
        schSectionName="Debug"
        name="TP3"
        doNotPlace
        footprintVariant="pad"
        padDiameter={1.2}
        pcbX={23}
        pcbY={-7}
        connections={{ pin1: "net.GND" }}
      />

      <R
        schSectionName="BatteryMonitor"
        name="R16"
        schMarginX={0.8}
        schMarginY={0.8}
        resistance="1M"
        pcbX={-22}
        pcbY={-18}
        layer="bottom"
        connections={{ pin1: "net.VBAT", pin2: "net.BAT_SENSE" }}
      />
      <R
        schSectionName="BatteryMonitor"
        name="R17"
        resistance="1M"
        pcbX={-22}
        pcbY={-21}
        layer="bottom"
        connections={{ pin1: "net.BAT_SENSE", pin2: "net.GND" }}
      />
      <C
        schSectionName="BatteryMonitor"
        name="C21"
        capacitance="100nF"
        pcbX={-22}
        pcbY={-24}
        layer="bottom"
        connections={{ pin1: "net.BAT_SENSE", pin2: "net.GND" }}
      />
    </>
  )
}

function RadioGnssSection() {
  return (
    <>
      <WioSx1262
        schSectionName="LoRa"
        name="U4"
        displayName="U4 LoRa / 865-867 MHz"
        pcbX={17}
        pcbY={-10.5}
        layer="bottom"
        internallyConnectedPins={[["GND1", "GND2"]]}
        schPinArrangement={{
          leftSide: ["MOSI", "MISO", "SCK", "NSS", "NRST", "BUSY", "DIO1"],
          rightSide: ["RF_SW", "ANT_NC"],
          topSide: ["VCC"],
          bottomSide: ["GND1", "GND2"],
        }}
        connections={{
          MISO: "net.LORA_MISO",
          MOSI: "net.LORA_MOSI",
          SCK: "net.LORA_SCK",
          NRST: "net.LORA_RESET",
          NSS: "net.LORA_NSS",
          GND1: "net.GND",
          GND2: "net.GND",
          VCC: "net.V3_3",
          BUSY: "net.LORA_BUSY",
          DIO1: "net.LORA_IRQ",
        }}
      />

      <C
        schSectionName="LoRa"
        name="C14"
        capacitance="10uF"
        footprint="0805"
        pcbX={22}
        pcbY={-19.5}
        layer="bottom"
        connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
      />
      <C
        schSectionName="LoRa"
        name="C15"
        capacitance="100nF"
        pcbX={17.5}
        pcbY={-19.5}
        layer="bottom"
        connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
      />

      <TPS22918DBVR
        schSectionName="GnssPower"
        name="U7"
        displayName="U7 Load switch / 3.3 V"
        pcbX={7}
        pcbY={-5}
        layer="bottom"
        noConnect={["CT"]}
        connections={{
          VIN: "net.V3_3",
          GND: "net.GND",
          ON: "net.GPS_ENABLE",
          QOD: "net.GPS_3V3",
          VOUT: "net.GPS_3V3",
        }}
      />
      <R
        schSectionName="GnssPower"
        name="R15"
        resistance="100k"
        pcbX={7}
        pcbY={-8.5}
        layer="bottom"
        connections={{ pin1: "net.GPS_ENABLE", pin2: "net.GND" }}
      />
      <C
        schSectionName="GnssPower"
        name="C16"
        capacitance="1uF"
        pcbX={7}
        pcbY={-2.5}
        layer="bottom"
        connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
      />

      <UartBufferFootprint
        schSectionName="GnssPower"
        name="U8"
        schMarginLeft={1}
        schMarginRight={1}
        displayName="U8 UART isolation / 3.3 V"
        manufacturerPartNumber="SN74LVC2G125DCUR"
        pcbX={3}
        pcbY={-9}
        layer="bottom"
        pinLabels={{
          pin1: "OE1_N",
          pin2: "A1",
          pin3: "Y2",
          pin4: "GND",
          pin5: "A2",
          pin6: "Y1",
          pin7: "OE2_N",
          pin8: "VCC",
        }}
        pinAttributes={{
          VCC: { requiresPower: true },
          GND: { requiresGround: true },
        }}
        connections={{
          OE1_N: "net.GND",
          A1: "net.GPS_UART_TX",
          Y1: "net.GPS_RX",
          A2: "net.GPS_TX",
          Y2: "net.GPS_UART_RX",
          GND: "net.GND",
          OE2_N: "net.GND",
          VCC: "net.GPS_3V3",
        }}
      />

      <C
        schSectionName="GnssReceiver"
        name="C17"
        schMarginTop={0.8}
        schMarginBottom={0.8}
        capacitance="10uF"
        footprint="0805"
        pcbX={3}
        pcbY={-2.5}
        layer="bottom"
        connections={{ pin1: "net.GPS_3V3", pin2: "net.GND" }}
      />
      <C
        schSectionName="GnssReceiver"
        name="C18"
        capacitance="100nF"
        pcbX={3}
        pcbY={-5}
        layer="bottom"
        connections={{ pin1: "net.GPS_3V3", pin2: "net.GND" }}
      />
      <C
        schSectionName="GnssReceiver"
        name="C19"
        schMarginTop={0.8}
        schMarginBottom={0.8}
        capacitance="100nF"
        pcbRotation={180}
        pcbX={3}
        pcbY={-12.5}
        layer="bottom"
        connections={{ pin1: "net.GPS_3V3", pin2: "net.GND" }}
      />

      <GnssFootprint
        schSectionName="GnssReceiver"
        name="U5"
        displayName="U5 GNSS / 3.3 V"
        manufacturerPartNumber="SAM-M10Q-00B"
        pcbX={0}
        pcbY={16}
        pinLabels={gnssPins}
        pinAttributes={{
          VCC: { requiresPower: true },
          V_IO: { requiresPower: true },
          V_BCKP: { requiresPower: true },
          GND1: { requiresGround: true },
        }}
        internallyConnectedPins={[
          [
            "GND1",
            "GND4",
            "GND5",
            "GND6",
            "GND10",
            "GND11",
            "GND15",
            "GND16",
            "GND20",
          ],
        ]}
        noConnect={[
          "TIMEPULSE",
          "SAFEBOOT_N",
          "SDA",
          "SCL",
          "RESET_N",
          "EXTINT",
        ]}
        schPinArrangement={{
          leftSide: ["RXD", "TXD"],
          rightSide: [
            "TIMEPULSE",
            "SAFEBOOT_N",
            "SDA",
            "SCL",
            "RESET_N",
            "EXTINT",
          ],
          topSide: ["VCC", "V_IO", "V_BCKP"],
          bottomSide: [
            "GND1",
            "GND4",
            "GND5",
            "GND6",
            "GND10",
            "GND11",
            "GND15",
            "GND16",
            "GND20",
          ],
        }}
        connections={{
          GND1: "net.GND",
          GND4: "net.GND",
          GND5: "net.GND",
          GND6: "net.GND",
          GND10: "net.GND",
          GND11: "net.GND",
          GND15: "net.GND",
          GND16: "net.GND",
          GND20: "net.GND",
          VCC: "net.GPS_3V3",
          V_IO: "net.GPS_3V3",
          V_BCKP: "net.V3_3",
          RXD: "net.GPS_RX",
          TXD: "net.GPS_TX",
        }}
      />
      <C
        schSectionName="GnssReceiver"
        name="C20"
        capacitance="100nF"
        pcbX={-1}
        pcbY={-2.5}
        layer="bottom"
        connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
      />

      {/* Trace-hint offsets use the parent group origin, not the selected pad. */}
      <tracehint for=".U5 > .V_IO" offset={{ x: -8.8, y: 17.9 }} />
      <tracehint for=".U5 > .V_BCKP" offset={{ x: -8.8, y: 16 }} />
      <tracehint for=".U5 > .RXD" offset={{ x: 8.8, y: 17.9 }} />
      <tracehint for=".U5 > .TXD" offset={{ x: 8.8, y: 16 }} />
      <tracehint for=".U5 > .VCC" offset={{ x: 1.9, y: 24.8 }} />
    </>
  )
}

const gnssPins = {
  pin1: "GND1",
  pin2: "V_IO",
  pin3: "V_BCKP",
  pin4: "GND4",
  pin5: "GND5",
  pin6: "GND6",
  pin7: "TIMEPULSE",
  pin8: "SAFEBOOT_N",
  pin9: "SDA",
  pin10: "GND10",
  pin11: "GND11",
  pin12: "SCL",
  pin13: "TXD",
  pin14: "RXD",
  pin15: "GND15",
  pin16: "GND16",
  pin17: "VCC",
  pin18: "RESET_N",
  pin19: "EXTINT",
  pin20: "GND20",
} as const

// Footprint adapted from KiCad Connector_JST/JST_PH_B3B-PH-K_1x03_P2.00mm_Vertical.
// KiCad library contributors; CC BY-SA 4.0 with the KiCad design exception:
// https://www.kicad.org/libraries/license/

const BatteryConnector = (props: ConnectorProps) => (
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

// The current font renderer uses ~0.45 of fontSize for actual ink height.
// 2.5 mm yields >1 mm tall characters and >0.15 mm strokes in the Gerbers.
// Dense passive references remain on the assembly drawings rather than silk.
function BoardLegend() {
  return (
    <>
      <silkscreentext text="LORA DEVICE" pcbX={0} pcbY={36} fontSize={2.5} />
      <silkscreentext
        text="865-867 MHz  REV C"
        pcbX={0}
        pcbY={32.5}
        fontSize={2.5}
      />
      <silkscreentext
        text="GPS SIDE TO SKY"
        pcbX={0}
        pcbY={28.5}
        fontSize={2.5}
      />
      <silkscreentext text="RST" pcbX={-11} pcbY={-3} fontSize={2.5} />
      <silkscreentext text="BOOT" pcbX={-3} pcbY={-3} fontSize={2.5} />
      <silkscreentext text="USER" pcbX={5} pcbY={-3} fontSize={2.5} />
      <silkscreentext text="PWR" pcbX={9.5} pcbY={-9} fontSize={2.3} />
      <silkscreentext text="CHG" pcbX={15} pcbY={-9} fontSize={2.3} />
      <silkscreentext text="LINK" pcbX={21} pcbY={-9} fontSize={2.3} />
      <silkscreentext text="+" pcbX={-21} pcbY={-4} fontSize={2.5} />
      <silkscreentext text="-" pcbX={-19} pcbY={-4} fontSize={2.5} />
      <silkscreentext text="T" pcbX={-17} pcbY={-4} fontSize={2.5} />
      <silkscreentext text="1S LiPo + NTC" pcbX={-12} pcbY={0} fontSize={2.5} />
      <silkscreentext
        text="TP1=TX TP2=RX TP3=GND"
        pcbX={0}
        pcbY={4}
        fontSize={2.5}
      />
      <silkscreentext text="USB" pcbX={18} pcbY={-30.9} fontSize={2.5} />
      <silkscreentext
        text="LORA IPEX"
        pcbX={17}
        pcbY={0}
        fontSize={2.5}
        layer="bottom"
      />
      <silkscreentext
        text="LORA DEVICE REV C"
        pcbX={0}
        pcbY={31}
        fontSize={2.5}
        layer="bottom"
      />
      {/* Cathode bars sit outside the LED pads. */}
      <silkscreenpath
        strokeWidth={0.2}
        route={[
          { x: 9.3, y: -6.1 },
          { x: 9.3, y: -4.9 },
        ]}
      />
      <silkscreenpath
        strokeWidth={0.2}
        route={[
          { x: 13.3, y: -6.1 },
          { x: 13.3, y: -4.9 },
        ]}
      />
      <silkscreenpath
        strokeWidth={0.2}
        route={[
          { x: 17.3, y: -6.1 },
          { x: 17.3, y: -4.9 },
        ]}
      />
    </>
  )
}

// Footprint adapted from KiCad RF_GPS/u-blox_SAM-M8Q.
// KiCad library contributors; CC BY-SA 4.0 with the KiCad design exception:
// https://www.kicad.org/libraries/license/

const GnssFootprint = (props: ChipProps) => (
  <chip
    footprint={
      <footprint>
        <smtpad
          portHints={["1"]}
          pcbX="-6.6mm"
          pcbY="3.8mm"
          layer="top"
          width="1.8mm"
          height="1.5mm"
          shape="rect"
        />
        <smtpad
          portHints={["2"]}
          pcbX="-6.6mm"
          pcbY="1.9mm"
          layer="top"
          width="1.8mm"
          height="1.5mm"
          shape="rect"
        />
        <smtpad
          portHints={["3"]}
          pcbX="-6.6mm"
          pcbY="0mm"
          layer="top"
          width="1.8mm"
          height="1.5mm"
          shape="rect"
        />
        <smtpad
          portHints={["4"]}
          pcbX="-6.6mm"
          pcbY="-1.9mm"
          layer="top"
          width="1.8mm"
          height="1.5mm"
          shape="rect"
        />
        <smtpad
          portHints={["5"]}
          pcbX="-6.6mm"
          pcbY="-3.8mm"
          layer="top"
          width="1.8mm"
          height="1.5mm"
          shape="rect"
        />
        <smtpad
          portHints={["6"]}
          pcbX="-3.8mm"
          pcbY="-6.6mm"
          layer="top"
          width="1.5mm"
          height="1.8mm"
          shape="rect"
        />
        <smtpad
          portHints={["7"]}
          pcbX="-1.9mm"
          pcbY="-6.6mm"
          layer="top"
          width="1.5mm"
          height="1.8mm"
          shape="rect"
        />
        <smtpad
          portHints={["8"]}
          pcbX="0mm"
          pcbY="-6.6mm"
          layer="top"
          width="1.5mm"
          height="1.8mm"
          shape="rect"
        />
        <smtpad
          portHints={["9"]}
          pcbX="1.9mm"
          pcbY="-6.6mm"
          layer="top"
          width="1.5mm"
          height="1.8mm"
          shape="rect"
        />
        <smtpad
          portHints={["10"]}
          pcbX="3.8mm"
          pcbY="-6.6mm"
          layer="top"
          width="1.5mm"
          height="1.8mm"
          shape="rect"
        />
        <smtpad
          portHints={["11"]}
          pcbX="6.6mm"
          pcbY="-3.8mm"
          layer="top"
          width="1.8mm"
          height="1.5mm"
          shape="rect"
        />
        <smtpad
          portHints={["12"]}
          pcbX="6.6mm"
          pcbY="-1.9mm"
          layer="top"
          width="1.8mm"
          height="1.5mm"
          shape="rect"
        />
        <smtpad
          portHints={["13"]}
          pcbX="6.6mm"
          pcbY="0mm"
          layer="top"
          width="1.8mm"
          height="1.5mm"
          shape="rect"
        />
        <smtpad
          portHints={["14"]}
          pcbX="6.6mm"
          pcbY="1.9mm"
          layer="top"
          width="1.8mm"
          height="1.5mm"
          shape="rect"
        />
        <smtpad
          portHints={["15"]}
          pcbX="6.6mm"
          pcbY="3.8mm"
          layer="top"
          width="1.8mm"
          height="1.5mm"
          shape="rect"
        />
        <smtpad
          portHints={["16"]}
          pcbX="3.8mm"
          pcbY="6.6mm"
          layer="top"
          width="1.5mm"
          height="1.8mm"
          shape="rect"
        />
        <smtpad
          portHints={["17"]}
          pcbX="1.9mm"
          pcbY="6.6mm"
          layer="top"
          width="1.5mm"
          height="1.8mm"
          shape="rect"
        />
        <smtpad
          portHints={["18"]}
          pcbX="0mm"
          pcbY="6.6mm"
          layer="top"
          width="1.5mm"
          height="1.8mm"
          shape="rect"
        />
        <smtpad
          portHints={["19"]}
          pcbX="-1.9mm"
          pcbY="6.6mm"
          layer="top"
          width="1.5mm"
          height="1.8mm"
          shape="rect"
        />
        <smtpad
          portHints={["20"]}
          pcbX="-3.8mm"
          pcbY="6.6mm"
          layer="top"
          width="1.5mm"
          height="1.8mm"
          shape="rect"
        />
        <courtyardrect width={16} height={16} />
        <via
          connectsTo="net.GND"
          pcbX={-4}
          pcbY={-4}
          outerDiameter={0.6}
          holeDiameter={0.3}
          layers={["top", "bottom"]}
        />
        <via
          connectsTo="net.GND"
          pcbX={-4}
          pcbY={0}
          outerDiameter={0.6}
          holeDiameter={0.3}
          layers={["top", "bottom"]}
        />
        <via
          connectsTo="net.GND"
          pcbX={-4}
          pcbY={4}
          outerDiameter={0.6}
          holeDiameter={0.3}
          layers={["top", "bottom"]}
        />
        <via
          connectsTo="net.GND"
          pcbX={0}
          pcbY={-4}
          outerDiameter={0.6}
          holeDiameter={0.3}
          layers={["top", "bottom"]}
        />
        <via
          connectsTo="net.GND"
          pcbX={0}
          pcbY={0}
          outerDiameter={0.6}
          holeDiameter={0.3}
          layers={["top", "bottom"]}
        />
        <via
          connectsTo="net.GND"
          pcbX={0}
          pcbY={4}
          outerDiameter={0.6}
          holeDiameter={0.3}
          layers={["top", "bottom"]}
        />
        <via
          connectsTo="net.GND"
          pcbX={4}
          pcbY={-4}
          outerDiameter={0.6}
          holeDiameter={0.3}
          layers={["top", "bottom"]}
        />
        <via
          connectsTo="net.GND"
          pcbX={4}
          pcbY={0}
          outerDiameter={0.6}
          holeDiameter={0.3}
          layers={["top", "bottom"]}
        />
        <via
          connectsTo="net.GND"
          pcbX={4}
          pcbY={4}
          outerDiameter={0.6}
          holeDiameter={0.3}
          layers={["top", "bottom"]}
        />
      </footprint>
    }
    {...props}
  />
)

const InductorFootprint = (props: Omit<InductorProps, "inductance">) => (
  <inductor
    inductance="1.5uH"
    footprint={
      <footprint>
        <smtpad
          portHints={["1"]}
          pcbX="-1.185mm"
          pcbY="0mm"
          layer="top"
          width="0.98mm"
          height="3.4mm"
          shape="rect"
        />
        <smtpad
          portHints={["2"]}
          pcbX="1.185mm"
          pcbY="0mm"
          layer="top"
          width="0.98mm"
          height="3.4mm"
          shape="rect"
        />
        <courtyardrect width={4.8} height={4.8} />
      </footprint>
    }
    {...props}
  />
)

// Footprint adapted from KiCad Package_SO/VSSOP-8_2.3x2mm_P0.5mm.
// KiCad library contributors; CC BY-SA 4.0 with the KiCad design exception:
// https://www.kicad.org/libraries/license/

const UartBufferFootprint = (props: ChipProps) => (
  <chip
    footprint={
      <footprint>
        <smtpad
          portHints={["1"]}
          pcbX="-1.4mm"
          pcbY="0.75mm"
          layer="top"
          cornerRadius="0.04375mm"
          width="1.25mm"
          height="0.35mm"
          shape="rect"
        />
        <smtpad
          portHints={["2"]}
          pcbX="-1.4mm"
          pcbY="0.25mm"
          layer="top"
          cornerRadius="0.04375mm"
          width="1.25mm"
          height="0.35mm"
          shape="rect"
        />
        <smtpad
          portHints={["3"]}
          pcbX="-1.4mm"
          pcbY="-0.25mm"
          layer="top"
          cornerRadius="0.04375mm"
          width="1.25mm"
          height="0.35mm"
          shape="rect"
        />
        <smtpad
          portHints={["4"]}
          pcbX="-1.4mm"
          pcbY="-0.75mm"
          layer="top"
          cornerRadius="0.04375mm"
          width="1.25mm"
          height="0.35mm"
          shape="rect"
        />
        <smtpad
          portHints={["5"]}
          pcbX="1.4mm"
          pcbY="-0.75mm"
          layer="top"
          cornerRadius="0.04375mm"
          width="1.25mm"
          height="0.35mm"
          shape="rect"
        />
        <smtpad
          portHints={["6"]}
          pcbX="1.4mm"
          pcbY="-0.25mm"
          layer="top"
          cornerRadius="0.04375mm"
          width="1.25mm"
          height="0.35mm"
          shape="rect"
        />
        <smtpad
          portHints={["7"]}
          pcbX="1.4mm"
          pcbY="0.25mm"
          layer="top"
          cornerRadius="0.04375mm"
          width="1.25mm"
          height="0.35mm"
          shape="rect"
        />
        <smtpad
          portHints={["8"]}
          pcbX="1.4mm"
          pcbY="0.75mm"
          layer="top"
          cornerRadius="0.04375mm"
          width="1.25mm"
          height="0.35mm"
          shape="rect"
        />
        <courtyardrect width={4.6} height={2.8} />
      </footprint>
    }
    {...props}
  />
)

// Coordinates in each path are local to its first connected component.
// JLC04161H-7628: 0.24 mm width / 0.16 mm pair gap / 0.20 mm ground gap.
function UsbRouting() {
  return (
    <>
      <trace
        name="UsbPositiveMain"
        from=".U6 > .pin6"
        to=".R12 > .pin2"
        thickness={0.24}
        pcbPath={[
          {
            x: -0.94996,
            y: 2.4,
          },
          {
            x: -0.94996,
            y: 2.4,
            via: true,
            fromLayer: "top",
            toLayer: "bottom",
          },
          {
            x: -0.94996,
            y: 2.4,
          },
          {
            x: -0.94996,
            y: 3.19996,
          },
          {
            x: -2.55,
            y: 4.8,
          },
          {
            x: -14.7,
            y: 4.8,
          },
          {
            x: -16,
            y: 6.1,
          },
          {
            x: -16,
            y: 14.55,
          },
          {
            x: -16,
            y: 14.55,
            via: true,
            fromLayer: "bottom",
            toLayer: "top",
          },
          {
            x: -16,
            y: 14.55,
          },
        ]}
      />
      <trace
        name="UsbNegativeMain"
        from=".U6 > .pin4"
        to=".R11 > .pin2"
        thickness={0.24}
        pcbPath={[
          {
            x: 0.94996,
            y: 2.4,
          },
          {
            x: 0.94996,
            y: 2.4,
            via: true,
            fromLayer: "top",
            toLayer: "bottom",
          },
          {
            x: 0.94996,
            y: 2.4,
          },
          {
            x: 0.415685,
            y: 2.4,
          },
          {
            x: -2.384315,
            y: 5.2,
          },
          {
            x: -14.534315,
            y: 5.2,
          },
          {
            x: -15.6,
            y: 6.265685,
          },
          {
            x: -15.6,
            y: 12.45,
          },
          {
            x: -15,
            y: 13.05,
          },
          {
            x: -15,
            y: 13.05,
            via: true,
            fromLayer: "bottom",
            toLayer: "top",
          },
          {
            x: -15,
            y: 13.05,
          },
        ]}
      />
      <trace
        name="UsbNegativeMcu"
        from=".R11 > .pin1"
        to=".U1 > .IO19"
        thickness={0.2}
        pcbPath={[".R11 > .pin1", ".U1 > .IO19"]}
      />
      <trace
        name="UsbPositiveMcu"
        from=".R12 > .pin1"
        to=".U1 > .IO20"
        thickness={0.2}
        pcbPath={[".R12 > .pin1", ".U1 > .IO20"]}
      />
      <copperpour
        name="UsbGroundReference"
        layer="inner2"
        connectsTo="net.GND"
        unbroken
        clearance={0.2}
        outline={[
          { x: 1, y: -13 },
          { x: 3.4, y: -13 },
          { x: 3.4, y: -21.8 },
          { x: 4.1, y: -22.5 },
          { x: 16.8, y: -22.5 },
          { x: 20.8, y: -26.5 },
          { x: 20.8, y: -28.3 },
          { x: 16.2, y: -28.3 },
          { x: 16.2, y: -25.8 },
          { x: 14.7, y: -24.3 },
          { x: 2.8, y: -24.3 },
          { x: 1, y: -22.5 },
        ]}
      />
      <via
        name="UsbGroundMcu"
        connectsTo="net.GND"
        pcbX={3.5}
        pcbY={-14}
        holeDiameter={0.3}
        outerDiameter={0.6}
        layers={["top", "bottom"]}
      />
      <via
        name="UsbGroundMid"
        connectsTo="net.GND"
        pcbX={3.5}
        pcbY={-17.5}
        holeDiameter={0.3}
        outerDiameter={0.6}
        layers={["top", "bottom"]}
      />
      <via
        name="UsbGroundTurn"
        connectsTo="net.GND"
        pcbX={14}
        pcbY={-24.8}
        holeDiameter={0.3}
        outerDiameter={0.6}
        layers={["top", "bottom"]}
      />
      <via
        name="UsbGroundEsd"
        connectsTo="net.GND"
        pcbX={20.2}
        pcbY={-25.5}
        holeDiameter={0.3}
        outerDiameter={0.6}
        layers={["top", "bottom"]}
      />
    </>
  )
}

// Seeed Wio-SX1262 Module Datasheet, figure 9 (top-view landing pattern).
// The IPEX version does not connect the carrier's ANT pad.
const WioSx1262 = (props: ChipProps) => (
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

const resistorParts: Record<string, string> = {
  "22": "RC0603FR-0722RL",
  "2.2k": "RC0603FR-072K2L",
  "3.24k": "RC0603FR-073K24L",
  "3.57k": "RC0603FR-073K57L",
  "5.1k": "RC0603FR-075K1L",
  "10k": "RC0603FR-0710KL",
  "100k": "RC0603FR-07100KL",
  "1M": "RC0603FR-071ML",
}

const capacitorParts: Record<string, { mpn: string; voltage: string }> = {
  "100nF": { mpn: "C0603C104K5RACTU", voltage: "50V" },
  "1uF": { mpn: "GRM188R61A105KA61D", voltage: "10V" },
  "10uF": { mpn: "GRM21BR61C106KE15L", voltage: "16V" },
  "22uF": { mpn: "GRM21BR61A226ME44L", voltage: "10V" },
}

const R = (props: ResistorProps) => (
  <resistor
    schRotation={-90}
    pcbStyle={{ silkscreenTextVisibility: "hidden" }}
    supplierPartNumbers={{}}
    manufacturerPartNumber={resistorParts[String(props.resistance)]}
    {...props}
    footprint={`${typeof props.footprint === "string" ? props.footprint : "0603"}_nosilkscreen`}
  />
)

const C = (props: CapacitorProps) => (
  <capacitor
    schRotation={-90}
    pcbStyle={{ silkscreenTextVisibility: "hidden" }}
    supplierPartNumbers={{}}
    manufacturerPartNumber={capacitorParts[String(props.capacitance)]?.mpn}
    maxVoltageRating={capacitorParts[String(props.capacitance)]?.voltage}
    {...props}
    footprint={`${typeof props.footprint === "string" ? props.footprint : "0603"}_nosilkscreen`}
  />
)

const bq24074rgtrPinLabels = {
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

const bq24074rgtrPinAttributes = {
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

const BQ24074RGTR = (props: ChipProps<typeof bq24074rgtrPinLabels>) => {
  return (
    <chip
      pinLabels={bq24074rgtrPinLabels}
      pinAttributes={bq24074rgtrPinAttributes}
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

const esp32S3Wroom1N8PinLabels = {
  pin1: ["GND1"],
  pin2: ["3V3"],
  pin3: ["EN"],
  pin4: ["IO4"],
  pin5: ["IO5"],
  pin6: ["IO6"],
  pin7: ["IO7"],
  pin8: ["IO15"],
  pin9: ["IO16"],
  pin10: ["IO17"],
  pin11: ["IO18"],
  pin12: ["IO8"],
  pin13: ["IO19"],
  pin14: ["IO20"],
  pin15: ["IO3"],
  pin16: ["IO46"],
  pin17: ["IO9"],
  pin18: ["IO10"],
  pin19: ["IO11"],
  pin20: ["IO12"],
  pin21: ["IO13"],
  pin22: ["IO14"],
  pin23: ["IO21"],
  pin24: ["IO47"],
  pin25: ["IO48"],
  pin26: ["IO45"],
  pin27: ["IO0"],
  pin28: ["IO35"],
  pin29: ["IO36"],
  pin30: ["IO37"],
  pin31: ["IO38"],
  pin32: ["IO39"],
  pin33: ["IO40"],
  pin34: ["IO41"],
  pin35: ["IO42"],
  pin36: ["RXD0"],
  pin37: ["TXD0"],
  pin38: ["IO2"],
  pin39: ["IO1"],
  pin40: ["GND2"],
  pin41: ["EP"],
} as const

const esp32S3Wroom1N8PinAttributes = {
  pin1: { requiresGround: true },
  pin2: { requiresPower: true },
  pin41: { requiresGround: true },
  pin40: { requiresGround: true },
} as const

const ESP32_S3_WROOM_1_N8 = (
  props: ChipProps<typeof esp32S3Wroom1N8PinLabels>,
) => {
  return (
    <chip
      pinLabels={esp32S3Wroom1N8PinLabels}
      pinAttributes={esp32S3Wroom1N8PinAttributes}
      supplierPartNumbers={{
        jlcpcb: ["C2913198"],
      }}
      manufacturerPartNumber="ESP32-S3-WROOM-1-N8"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin1"]}
            pcbX="-8.899779mm"
            pcbY="9.1046427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin2"]}
            pcbX="-8.899779mm"
            pcbY="7.8346427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin3"]}
            pcbX="-8.899779mm"
            pcbY="6.5646427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin4"]}
            pcbX="-8.899779mm"
            pcbY="5.2946427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin5"]}
            pcbX="-8.899779mm"
            pcbY="4.0246427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin6"]}
            pcbX="-8.899779mm"
            pcbY="2.7546427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin7"]}
            pcbX="-8.899779mm"
            pcbY="1.4846427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin8"]}
            pcbX="-8.899779mm"
            pcbY="0.2146427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin9"]}
            pcbX="-8.899779mm"
            pcbY="-1.0553573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin10"]}
            pcbX="-8.899779mm"
            pcbY="-2.3253573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin11"]}
            pcbX="-8.899779mm"
            pcbY="-3.5953573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin12"]}
            pcbX="-8.899779mm"
            pcbY="-4.8653573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin13"]}
            pcbX="-8.899779mm"
            pcbY="-6.1353573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin14"]}
            pcbX="-8.899779mm"
            pcbY="-7.4053573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin15"]}
            pcbX="-6.984873mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin16"]}
            pcbX="-5.714873mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin17"]}
            pcbX="-4.444873mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin18"]}
            pcbX="-3.174873mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin19"]}
            pcbX="-1.904873mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin20"]}
            pcbX="-0.634873mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin21"]}
            pcbX="0.635127mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin22"]}
            pcbX="1.905127mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin23"]}
            pcbX="3.175127mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin24"]}
            pcbX="4.445127mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin25"]}
            pcbX="5.715127mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin26"]}
            pcbX="6.985127mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin27"]}
            pcbX="8.899779mm"
            pcbY="-7.4053573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin28"]}
            pcbX="8.899779mm"
            pcbY="-6.1353573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin29"]}
            pcbX="8.899779mm"
            pcbY="-4.8653573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin30"]}
            pcbX="8.899779mm"
            pcbY="-3.5953573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin31"]}
            pcbX="8.899779mm"
            pcbY="-2.3253573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin32"]}
            pcbX="8.899779mm"
            pcbY="-1.0553573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin33"]}
            pcbX="8.899779mm"
            pcbY="0.2146427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin34"]}
            pcbX="8.899779mm"
            pcbY="1.4846427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin35"]}
            pcbX="8.899779mm"
            pcbY="2.7546427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin36"]}
            pcbX="8.899779mm"
            pcbY="4.0246427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin37"]}
            pcbX="8.899779mm"
            pcbY="5.2946427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin38"]}
            pcbX="8.899779mm"
            pcbY="6.5646427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin39"]}
            pcbX="8.899779mm"
            pcbY="7.8346427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin40"]}
            pcbX="8.899779mm"
            pcbY="9.1046427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin41"]}
            pcbX="-1.499489mm"
            pcbY="1.3850747mm"
            width="0.8999982mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin41"]}
            pcbX="-2.899537mm"
            pcbY="1.3850747mm"
            width="0.8999982mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin41"]}
            pcbX="-0.099441mm"
            pcbY="1.3850747mm"
            width="0.8999982mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin41"]}
            pcbX="-0.099441mm"
            pcbY="2.7851227mm"
            width="0.8999982mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin41"]}
            pcbX="-1.499489mm"
            pcbY="2.7851227mm"
            width="0.8999982mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin41"]}
            pcbX="-2.899537mm"
            pcbY="2.7851227mm"
            width="0.8999982mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin41"]}
            pcbX="-2.899537mm"
            pcbY="-0.0149733mm"
            width="0.8999982mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin41"]}
            pcbX="-1.499489mm"
            pcbY="-0.0149733mm"
            width="0.8999982mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin41"]}
            pcbX="-0.099441mm"
            pcbY="-0.0149733mm"
            width="0.8999982mm"
            height="0.8999982mm"
            shape="rect"
          />
          <courtyardoutline
            outline={[
              { x: -9.899777500000027, y: 16.849954099999877 },
              { x: 9.899777500000027, y: 16.849954099999877 },
              { x: 9.899777500000027, y: -9.804641800000013 },
              { x: -9.899777500000027, y: -9.804641800000013 },
              { x: -9.899777500000027, y: 16.849954099999877 },
            ]}
          />
          <via
            connectsTo="net.GND"
            pcbX={-4.2}
            pcbY={1.385}
            outerDiameter={0.6}
            holeDiameter={0.3}
            layers={["top", "bottom"]}
          />
          <via
            connectsTo="net.GND"
            pcbX={1.2}
            pcbY={1.385}
            outerDiameter={0.6}
            holeDiameter={0.3}
            layers={["top", "bottom"]}
          />
          <via
            connectsTo="net.GND"
            pcbX={-1.5}
            pcbY={4.1}
            outerDiameter={0.6}
            holeDiameter={0.3}
            layers={["top", "bottom"]}
          />
          <via
            connectsTo="net.GND"
            pcbX={-1.5}
            pcbY={-1.3}
            outerDiameter={0.6}
            holeDiameter={0.3}
            layers={["top", "bottom"]}
          />
        </footprint>
      }
      {...props}
    />
  )
}

const ltstC190kfktPinLabels = {
  pin1: ["cathode", "neg"],
  pin2: ["anode", "pos"],
} as const

const LTST_C190KFKT = (props: LedProps) => {
  const { name = "LED1", ...restProps } = props

  return (
    <led
      name={name}
      pinLabels={ltstC190kfktPinLabels}
      supplierPartNumbers={{
        jlcpcb: ["C157740"],
      }}
      manufacturerPartNumber="LTST-C190KFKT"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin2", "anode", "pos"]}
            pcbX="0.7489952mm"
            pcbY="0.000127mm"
            width="0.7999984mm"
            height="0.7999984mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin1", "cathode", "neg"]}
            pcbX="-0.7489952mm"
            pcbY="-0.000127mm"
            width="0.7999984mm"
            height="0.7999984mm"
            shape="rect"
          />
          <fabricationnotepath
            route={[
              { x: -1.07000040000014, y: 0.061518800000044394 },
              { x: -0.5299964000000728, y: 0.061518800000044394 },
              { x: -0.5299964000000728, y: -0.06847839999988992 },
              { x: -1.07000040000014, y: -0.06847839999988992 },
              { x: -1.07000040000014, y: 0.061518800000044394 },
            ]}
            strokeWidth="0mm"
            isFilled
            hasStroke={false}
          />
          <fabricationnotepath
            route={[
              { x: 0.7345679999998538, y: -0.26708099999996193 },
              { x: 0.7345679999998538, y: 0.2729229999999916 },
              { x: 0.864539799999875, y: 0.2729229999999916 },
              { x: 0.864539799999875, y: -0.26708099999996193 },
              { x: 0.7345679999998538, y: -0.26708099999996193 },
            ]}
            strokeWidth="0mm"
            isFilled
            hasStroke={false}
          />
          <fabricationnotepath
            route={[
              { x: 0.5289295999999695, y: 0.06837679999989632 },
              { x: 1.0689336000000367, y: 0.06837679999989632 },
              { x: 1.0689336000000367, y: -0.0616203999999243 },
              { x: 0.5289295999999695, y: -0.0616203999999243 },
              { x: 0.5289295999999695, y: 0.06837679999989632 },
            ]}
            strokeWidth="0mm"
            isFilled
            hasStroke={false}
          />
          <courtyardoutline
            outline={[
              { x: -1.3989943999999923, y: 0.6599813999999924 },
              { x: 1.3989943999998786, y: 0.6599813999999924 },
              { x: 1.3989943999998786, y: -0.6600067999999055 },
              { x: -1.3989943999999923, y: -0.6600067999999055 },
              { x: -1.3989943999999923, y: 0.6599813999999924 },
            ]}
          />
        </footprint>
      }
      {...restProps}
    />
  )
}

const ltstC190kgktPinLabels = {
  pin1: ["cathode", "neg"],
  pin2: ["anode", "pos"],
} as const

const ltstC190kgktPinAttributes = {
  pin2: { isPassive: true },
  pin1: { isPassive: true },
} satisfies NonNullable<LedProps["pinAttributes"]>

const LTST_C190KGKT = (props: LedProps) => {
  const { name = "LED1", ...restProps } = props

  return (
    <led
      name={name}
      pinLabels={ltstC190kgktPinLabels}
      supplierPartNumbers={{
        jlcpcb: ["C125094"],
      }}
      manufacturerPartNumber="LTST-C190KGKT"
      pinAttributes={ltstC190kgktPinAttributes}
      footprint={
        <footprint>
          <smtpad
            portHints={["pin2", "anode", "pos"]}
            pcbX="0.7489952mm"
            pcbY="0.000127mm"
            width="0.7999984mm"
            height="0.7999984mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin1", "cathode", "neg"]}
            pcbX="-0.7489952mm"
            pcbY="-0.000127mm"
            width="0.7999984mm"
            height="0.7999984mm"
            shape="rect"
          />
          <fabricationnotepath
            route={[
              { x: -1.07000040000014, y: 0.061518800000044394 },
              { x: -0.5299964000000728, y: 0.061518800000044394 },
              { x: -0.5299964000000728, y: -0.06847839999988992 },
              { x: -1.07000040000014, y: -0.06847839999988992 },
              { x: -1.07000040000014, y: 0.061518800000044394 },
            ]}
            strokeWidth="0mm"
            isFilled
            hasStroke={false}
          />
          <fabricationnotepath
            route={[
              { x: 0.7345679999998538, y: -0.26708099999996193 },
              { x: 0.7345679999998538, y: 0.2729229999999916 },
              { x: 0.864539799999875, y: 0.2729229999999916 },
              { x: 0.864539799999875, y: -0.26708099999996193 },
              { x: 0.7345679999998538, y: -0.26708099999996193 },
            ]}
            strokeWidth="0mm"
            isFilled
            hasStroke={false}
          />
          <fabricationnotepath
            route={[
              { x: 0.5289295999999695, y: 0.06837679999989632 },
              { x: 1.0689336000000367, y: 0.06837679999989632 },
              { x: 1.0689336000000367, y: -0.0616203999999243 },
              { x: 0.5289295999999695, y: -0.0616203999999243 },
              { x: 0.5289295999999695, y: 0.06837679999989632 },
            ]}
            strokeWidth="0mm"
            isFilled
            hasStroke={false}
          />
          <courtyardoutline
            outline={[
              { x: -1.3989943999999923, y: 0.6599813999999924 },
              { x: 1.3989943999998786, y: 0.6599813999999924 },
              { x: 1.3989943999998786, y: -0.6600067999999055 },
              { x: -1.3989943999999923, y: -0.6600067999999055 },
              { x: -1.3989943999999923, y: 0.6599813999999924 },
            ]}
          />
        </footprint>
      }
      {...restProps}
    />
  )
}

const ltstC190tbktPinLabels = {
  pin1: ["cathode", "neg"],
  pin2: ["anode", "pos"],
} as const

const LTST_C190TBKT = (props: LedProps) => {
  const { name = "LED1", ...restProps } = props

  return (
    <led
      name={name}
      pinLabels={ltstC190tbktPinLabels}
      supplierPartNumbers={{
        jlcpcb: ["C125096"],
      }}
      manufacturerPartNumber="LTST-C190TBKT"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin2", "anode", "pos"]}
            pcbX="0.7489952mm"
            pcbY="0.000127mm"
            width="0.7999984mm"
            height="0.7999984mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin1", "cathode", "neg"]}
            pcbX="-0.7489952mm"
            pcbY="-0.000127mm"
            width="0.7999984mm"
            height="0.7999984mm"
            shape="rect"
          />
          <fabricationnotepath
            route={[
              { x: -1.07000040000014, y: 0.061518800000044394 },
              { x: -0.5299964000000728, y: 0.061518800000044394 },
              { x: -0.5299964000000728, y: -0.06847839999988992 },
              { x: -1.07000040000014, y: -0.06847839999988992 },
              { x: -1.07000040000014, y: 0.061518800000044394 },
            ]}
            strokeWidth="0mm"
            isFilled
            hasStroke={false}
          />
          <fabricationnotepath
            route={[
              { x: 0.7345679999998538, y: -0.26708099999996193 },
              { x: 0.7345679999998538, y: 0.2729229999999916 },
              { x: 0.864539799999875, y: 0.2729229999999916 },
              { x: 0.864539799999875, y: -0.26708099999996193 },
              { x: 0.7345679999998538, y: -0.26708099999996193 },
            ]}
            strokeWidth="0mm"
            isFilled
            hasStroke={false}
          />
          <fabricationnotepath
            route={[
              { x: 0.5289295999999695, y: 0.06837679999989632 },
              { x: 1.0689336000000367, y: 0.06837679999989632 },
              { x: 1.0689336000000367, y: -0.0616203999999243 },
              { x: 0.5289295999999695, y: -0.0616203999999243 },
              { x: 0.5289295999999695, y: 0.06837679999989632 },
            ]}
            strokeWidth="0mm"
            isFilled
            hasStroke={false}
          />
          <courtyardoutline
            outline={[
              { x: -1.3989943999999923, y: 0.6599813999999924 },
              { x: 1.3989943999998786, y: 0.6599813999999924 },
              { x: 1.3989943999998786, y: -0.6600067999999055 },
              { x: -1.3989943999999923, y: -0.6600067999999055 },
              { x: -1.3989943999999923, y: 0.6599813999999924 },
            ]}
          />
        </footprint>
      }
      {...restProps}
    />
  )
}

const tps22918dbvrPinLabels = {
  pin1: ["VIN"],
  pin2: ["GND"],
  pin3: ["ON"],
  pin4: ["CT"],
  pin5: ["QOD"],
  pin6: ["VOUT"],
} as const

const tps22918dbvrPinAttributes = {
  pin1: { isInput: true, requiresPower: true, mustBeConnected: true },
  pin2: { isPassive: true, requiresGround: true, mustBeConnected: true },
  pin3: { isInput: true, mustBeConnected: true },
  pin6: { isOutput: true, providesPower: true },
  pin5: { isOutput: true },
  pin4: { isOutput: true },
} satisfies NonNullable<ChipProps["pinAttributes"]>

const TPS22918DBVR = (props: ChipProps<typeof tps22918dbvrPinLabels>) => {
  return (
    <chip
      pinLabels={tps22918dbvrPinLabels}
      pinAttributes={tps22918dbvrPinAttributes}
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

const tps63021dsjrPinLabels = {
  pin1: ["VINA"],
  pin2: ["GND"],
  pin3: ["FB"],
  pin4: ["VOUT1"],
  pin5: ["VOUT2"],
  pin6: ["L22"],
  pin7: ["L21"],
  pin8: ["L11"],
  pin9: ["L12"],
  pin10: ["VIN1"],
  pin11: ["VIN2"],
  pin12: ["EN"],
  pin13: ["PS", "SYNC"],
  pin14: ["PG"],
  pin15: ["PGND"],
} as const

const tps63021dsjrPinAttributes = {
  pin2: { requiresGround: true },
  pin10: { requiresPower: true },
  pin11: { requiresPower: true },
  pin15: { requiresGround: true },
} as const

const TPS63021DSJR = (props: ChipProps<typeof tps63021dsjrPinLabels>) => {
  return (
    <chip
      pinLabels={tps63021dsjrPinLabels}
      pinAttributes={tps63021dsjrPinAttributes}
      supplierPartNumbers={{
        jlcpcb: ["C202140"],
      }}
      manufacturerPartNumber="TPS63021DSJR"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin1"]}
            pcbX="-1.5000986mm"
            pcbY="-1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin2"]}
            pcbX="-0.9999726mm"
            pcbY="-1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin3"]}
            pcbX="-0.4998466mm"
            pcbY="-1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin4"]}
            pcbX="0.0000254mm"
            pcbY="-1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin5"]}
            pcbX="0.5001514mm"
            pcbY="-1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin10"]}
            pcbX="0.5001514mm"
            pcbY="1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin11"]}
            pcbX="0.0000254mm"
            pcbY="1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin12"]}
            pcbX="-0.4998466mm"
            pcbY="1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin13"]}
            pcbX="-0.9999726mm"
            pcbY="1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin14"]}
            pcbX="-1.5000986mm"
            pcbY="1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin7"]}
            pcbX="1.5001494mm"
            pcbY="-1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin6"]}
            pcbX="1.0000234mm"
            pcbY="-1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin8"]}
            pcbX="1.5001494mm"
            pcbY="1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin9"]}
            pcbX="1.0000234mm"
            pcbY="1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin15"]}
            points={[
              { x: "-2.1999956mm", y: "0.7900162mm" },
              { x: "-2.1999956mm", y: "0.5900166mm" },
              { x: "-1.4299946mm", y: "0.5900166mm" },
              { x: "-1.4299946mm", y: "0.3300222mm" },
              { x: "-2.1999956mm", y: "0.3300222mm" },
              { x: "-2.1999956mm", y: "0.1300226mm" },
              { x: "-1.4299946mm", y: "0.1300226mm" },
              { x: "-1.4299946mm", y: "-0.1299718mm" },
              { x: "-2.1999956mm", y: "-0.1299718mm" },
              { x: "-2.1999956mm", y: "-0.3299714mm" },
              { x: "-1.4299946mm", y: "-0.3299714mm" },
              { x: "-1.4299946mm", y: "-0.5899658mm" },
              { x: "-2.1999956mm", y: "-0.5899658mm" },
              { x: "-2.1999956mm", y: "-0.7899654mm" },
              { x: "2.1999956mm", y: "-0.7899654mm" },
              { x: "2.1999956mm", y: "-0.5899658mm" },
              { x: "1.4299946mm", y: "-0.5899658mm" },
              { x: "1.4299946mm", y: "-0.3299714mm" },
              { x: "2.1999956mm", y: "-0.3299714mm" },
              { x: "2.1999956mm", y: "-0.1299718mm" },
              { x: "1.4299946mm", y: "-0.1299718mm" },
              { x: "1.4299946mm", y: "0.1300226mm" },
              { x: "2.1999956mm", y: "0.1300226mm" },
              { x: "2.1999956mm", y: "0.3300222mm" },
              { x: "1.4299946mm", y: "0.3300222mm" },
              { x: "1.4299946mm", y: "0.5900166mm" },
              { x: "2.1999956mm", y: "0.5900166mm" },
              { x: "2.1999956mm", y: "0.7900162mm" },
              { x: "-2.1999956mm", y: "0.7900162mm" },
            ]}
            shape="polygon"
          />
          <courtyardoutline
            outline={[
              { x: -2.4499955999999656, y: 2.050085299999978 },
              { x: 2.4499955999999656, y: 2.050085299999978 },
              { x: 2.4499955999999656, y: -2.0500853000000916 },
              { x: -2.4499955999999656, y: -2.0500853000000916 },
              { x: -2.4499955999999656, y: 2.050085299999978 },
            ]}
          />
        </footprint>
      }
      {...props}
    />
  )
}

const ts1088Ar02016PinLabels = {
  pin1: ["pin1"],
  pin2: ["pin2"],
} as const

const TS_1088_AR02016 = (
  props: PushButtonProps<typeof ts1088Ar02016PinLabels>,
) => {
  const { name = "SW1", ...restProps } = props

  return (
    <pushbutton
      name={name}
      pinLabels={ts1088Ar02016PinLabels}
      supplierPartNumbers={{
        jlcpcb: ["C720477"],
      }}
      manufacturerPartNumber="TS-1088-AR02016"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin1"]}
            pcbX="-2.184908mm"
            pcbY="0mm"
            width="1.229995mm"
            height="1.8599912mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin2"]}
            pcbX="2.184908mm"
            pcbY="0mm"
            width="1.229995mm"
            height="1.8599912mm"
            shape="rect"
          />
          <courtyardoutline
            outline={[
              { x: -3.049905499999909, y: 1.700009800000089 },
              { x: 3.049905499999795, y: 1.700009800000089 },
              { x: 3.049905499999795, y: -1.6999843999999484 },
              { x: -3.049905499999909, y: -1.6999843999999484 },
              { x: -3.049905499999909, y: 1.700009800000089 },
            ]}
          />
        </footprint>
      }
      {...restProps}
    />
  )
}

const typeC31M12PinLabels = {
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

const typeC31M12PinAttributes = {
  pin5: { isPassive: true },
  pin6: { isPassive: true },
  pin7: { isPassive: true },
  pin8: { isPassive: true },
  pin9: { isPassive: true },
  pin10: { isPassive: true },
  pin11: { isPassive: true },
  pin12: { isPassive: true },
} satisfies NonNullable<ChipProps["pinAttributes"]>

const TYPE_C_31_M_12 = (props: ChipProps<typeof typeC31M12PinLabels>) => {
  return (
    <connector
      isSmt={false}
      pinLabels={typeC31M12PinLabels}
      pinAttributes={typeC31M12PinAttributes}
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

const usblc62sc6PinLabels = {
  pin1: ["pin1"],
  pin2: ["pin2"],
  pin3: ["pin3"],
  pin4: ["pin4"],
  pin5: ["pin5"],
  pin6: ["pin6"],
} as const

const usblc62sc6PinAttributes = {
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

const USBLC6_2SC6 = (props: ChipProps<typeof usblc62sc6PinLabels>) => {
  return (
    <chip
      pinLabels={usblc62sc6PinLabels}
      pinAttributes={usblc62sc6PinAttributes}
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
