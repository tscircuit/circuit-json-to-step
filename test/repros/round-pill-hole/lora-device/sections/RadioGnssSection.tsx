import { WioSx1262 } from "../components/WioSx1262"
import { GnssFootprint } from "../components/GnssFootprint"
import { UartBufferFootprint } from "../components/UartBufferFootprint"
import { TPS22918DBVR } from "../imports/TPS22918DBVR"
import { gnssPins } from "../pins"
import { R, C } from "../components/passives"

export function RadioGnssSection() {
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
