import { ESP32_S3_WROOM_1_N8 } from "../imports/ESP32_S3_WROOM_1_N8"
import { TS_1088_AR02016 } from "../imports/TS_1088_AR02016"
import { LTST_C190TBKT } from "../imports/LTST_C190TBKT"
import { R, C } from "../components/passives"

export function ControllerSection() {
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
