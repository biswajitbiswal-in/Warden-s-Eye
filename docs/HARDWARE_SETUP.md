# Hardware Setup — SmartPPE Prototype

**Status:** Hardware Specification & Wiring Guide (RC522 SPI Wiring Verified in Docs; Sensor GPIOs & Firmware Code To Be Confirmed)

---

## 1. Hardware Scope & Disclaimers

The SmartPPE workplace safety prototype hardware node includes:
- **ESP32 Development Board** (30-pin or 38-pin Wi-Fi Dual-Core MCU).
- **MFRC522 (RC522) 13.56 MHz RFID Reader** (SPI interface).
- **Compatible 13.56 MHz ISO/IEC 14443A RFID Cards / Tags** (e.g., MIFARE Classic 1K).
- **Smoke Sensor Module** (supplementary prototype hazard sensor).
- **Flame Sensor Module** (supplementary prototype hazard sensor).
- **USB Power Supply & Jumper Wires / Breadboard**.
- **Camera Input** (connected to the separate computer-vision ML host/service; not wired to the ESP32).

> **Strict Design Boundaries:**
> 1. **No Smart Helmet Hardware:** SmartPPE does **not** include smart helmet construction or helmet-mounted sensors. PPE compliance is monitored via workplace cameras, and worker identification uses checkpoint/station RFID readers.
> 2. **Supplementary Prototype Sensors Only:** The smoke and flame sensor modules are included solely to demonstrate real-time IoT environmental alerting in a controlled prototype setup. They are **not** calibrated or certified industrial fire/gas safety instruments.

---

## 2. MFRC522 (RC522) RFID Reader Compatibility & Voltage Warning

- **Frequency & Protocol:** MFRC522 reads **13.56 MHz ISO/IEC 14443A** cards/tags. It does **not** read 125 kHz EM4100 proximity cards.
- **SPI Chip-Select Pin Naming:** On the RC522 PCB silkscreen, the pin labeled **`SDA`** functions as the **SPI Slave Select / Chip Select (`SS` / `CS`)** pin when operating in SPI mode—it is **not** an I2C SDA line.
- **CRITICAL 3.3V VOLTAGE WARNING:** The MFRC522 chip is a **3.3 V device**. Power its `3.3V` (`VCC`) pin strictly from the ESP32's **`3V3`** pin. **Never connect RC522 power or signal lines directly to 5 V (`VIN` / `5V`)**, as 5 V can permanently destroy the MFRC522 IC and damage ESP32 GPIO pins.

---

## 3. Verified ESP32-to-RC522 SPI Wiring

This pin mapping uses the standard ESP32 VSPI hardware bus and is **verified across project documentation**:

| RC522 Pin Label | Function | ESP32 Pin | Wiring Status |
|---|---|---|---|
| **3.3V** (`VCC`) | 3.3 V Power Supply | **3V3** | **VERIFIED** (3.3 V only — never 5 V) |
| **GND** | Common Ground | **GND** | **VERIFIED** |
| **RST** | Reset | **GPIO 22** | **VERIFIED** |
| **SDA** (`SS` / `CS`) | SPI Chip Select | **GPIO 5** | **VERIFIED** (SPI SS, not I2C) |
| **SCK** | SPI Clock | **GPIO 18** | **VERIFIED** (VSPI SCK) |
| **MOSI** | SPI Master Out Slave In | **GPIO 23** | **VERIFIED** (VSPI MOSI) |
| **MISO** | SPI Master In Slave Out | **GPIO 19** | **VERIFIED** (VSPI MISO) |
| **IRQ** | Interrupt (Unused) | *Not connected* | **VERIFIED** |

---

## 4. Smoke and Flame Sensor Integration & ESP32 Pin Constraints

### 4.1 Actual Sensor GPIO Pin Assignments: `TO BE CONFIRMED`
Because no ESP32 firmware sketch (`.ino`) or schematic file is currently committed to the repository, the exact GPIO pins used on the physical breadboard for the smoke and flame sensors are marked **`TO BE CONFIRMED`** with the hardware team member. Do not assume hardcoded pin numbers without verifying against the actual firmware.

### 4.2 Critical ESP32 Hardware Rules for Smoke & Flame Sensors

1. **ESP32 `ADC2` Wi-Fi Conflict (Must Use `ADC1` for Analog Readings):**
   - On the ESP32 architecture, **`ADC2` pins (`GPIO 0, 2, 4, 12, 13, 14, 15, 25, 26, 27`) cannot be used for `analogRead()` while the Wi-Fi radio is active**. Attempting to read an `ADC2` pin while connected to Wi-Fi causes `analogRead()` to fail or return invalid values.
   - Any analog sensor output (`AO`) **must** be wired to an **`ADC1` pin (`GPIO 32, 33, 34, 35, 36, or 39`)**.
   - *(Note: `GPIO 34, 35, 36, 39` are input-only pins and do not have internal pull-up/pull-down resistors.)*

2. **CRITICAL 3.3V GPIO Input Voltage Limit & Voltage Divider Warning:**
   - ESP32 GPIO pins are **3.3 V maximum** (`0 V` to `3.3 V` for 12-bit `ADC1` readings `0..4095`). They are **not 5 V tolerant**.
   - Many common smoke sensor modules (such as MQ-2 gas/smoke modules requiring a 5 V heater supply) output up to **5 V** on their Analog Output (`AO`) and Digital Output (`DO`) pins.
   - **Required Protection:** If a sensor module is powered from 5 V, **never connect its `AO` or `DO` output directly to an ESP32 pin**. Use a **voltage divider** (for example, a $10\text{ k}\Omega$ resistor in series from sensor output to ESP32 pin, and a $20\text{ k}\Omega$ resistor from ESP32 pin to `GND`, scaling $5.0\text{ V} \rightarrow 3.33\text{ V}$) or a 3.3 V logic-level shifter, or power 3.3 V-compatible flame sensor comparator boards from `3V3`.

### 4.3 Proposed / Recommended Sensor Pin Options (For Team Confirmation)

If the hardware team is finalizing pin selection, the following **`ADC1`** pins avoid all conflicts with the RC522 VSPI bus (`GPIO 5, 18, 19, 22, 23`) and the ESP32 Wi-Fi subsystem:

| Sensor Module | Signal Type | Actual Project Pin | Proposed / Recommended ESP32 Pin | Notes |
|---|---|---|---|---|
| **Smoke Sensor** | Analog Output (`AO`) | **`TO BE CONFIRMED`** | **Proposed: `GPIO 34` (`ADC1_CH6`)** | Requires 3.3 V max input (use voltage divider if module is 5 V) |
| **Smoke Sensor** | Digital Output (`DO`, optional) | **`TO BE CONFIRMED`** | **Proposed: `GPIO 32`** | Optional comparator trigger pin |
| **Flame Sensor** | Analog Output (`AO`) | **`TO BE CONFIRMED`** | **Proposed: `GPIO 35` (`ADC1_CH7`)** | Power module from `3V3` where supported |
| **Flame Sensor** | Digital Output (`DO`, optional) | **`TO BE CONFIRMED`** | **Proposed: `GPIO 33`** | Note: Most IR flame comparator boards output `LOW (0)` when flame is detected |

---

## 5. ESP32 Firmware Design Requirements & Cooldowns

To operate reliably during live workplace monitoring and hackathon demonstrations, the ESP32 firmware must implement non-blocking `millis()` timing rather than long blocking `delay()` loops:

1. **Unique Device Identity & Firmware Version:**
   - Configure each ESP32 with its unique registered `deviceCode` (e.g., `"ESP32_001"`), `firmwareVersion` (e.g., `"1.0.0"`), and `X-Device-Key` credential (kept out of public Git commits via a local ignored `secrets.h`).
2. **RFID Scan Cooldown (Local Debounce):**
   - After reading a card UID via MFRC522 (`PICC_IsNewCardPresent()` + `PICC_ReadCardSerial()`), call `PICC_HaltA()` and `PCD_StopCrypto1()`.
   - Enforce a **local same-UID cooldown of 3 to 5 seconds** on the ESP32 (in addition to the backend's duplicate-scan cooldown window) so holding a card against the reader does not transmit repeated HTTP requests.
3. **Sensor Warm-Up, Filtering & Event Debounce:**
   - **Smoke Sensor Warm-Up:** Apply a boot warm-up grace period (e.g., 15–30 seconds) before evaluating smoke thresholds so cold heater resistance does not trigger a false startup alert.
   - **Moving Average Filter:** Average 5 consecutive `ADC1` samples before comparing against `threshold`.
   - **Event Transmission Cooldown:** When a sensor crosses into `"WARNING"` or `"CRITICAL"`, send `POST /api/sensors/events` immediately, then enforce a local transmission cooldown (e.g., 10–15 seconds) while the hazard persists so the ESP32 remains responsive to RFID scans.
4. **Periodic Device Heartbeat:**
   - Send `POST /api/devices/heartbeat` every **30 seconds** (`HEARTBEAT_INTERVAL_MS = 30000`). The backend marks devices `"OFFLINE"` if no heartbeat or event arrives within 90 seconds.
5. **Network Failure & Reconnect Handling:**
   - Check `WiFi.status() == WL_CONNECTED` on each loop iteration; if disconnected, trigger non-blocking Wi-Fi reconnection and optionally buffer recent RFID/sensor events in a small in-memory ring buffer until connectivity resumes.

---

## 6. Canonical Hardware-to-Backend HTTP Payloads

All ESP32 requests must match the **Canonical Proposed API Contract** in [`docs/ApiDocumentation.md`](ApiDocumentation.md) and include the device authentication headers:

```http
Content-Type: application/json
X-Device-Code: ESP32_001
X-Device-Key: <RAW_DEVICE_API_KEY>
```

### 6.1 RFID Scan Payload (`POST /api/rfid/scan`)
```json
{
  "deviceCode": "ESP32_001",
  "rfidUid": "A1B2C3D4",
  "occurredAt": "2026-11-25T10:30:00Z",
  "firmwareVersion": "1.0.0"
}
```

### 6.2 Sensor Event Payload (`POST /api/sensors/events`)
```json
{
  "deviceCode": "ESP32_001",
  "sensorType": "SMOKE",
  "sensorValue": 1850,
  "threshold": 1500,
  "alertStatus": "CRITICAL",
  "occurredAt": "2026-11-25T10:35:00Z",
  "firmwareVersion": "1.0.0"
}
```

### 6.3 Device Heartbeat Payload (`POST /api/devices/heartbeat`)
```json
{
  "deviceCode": "ESP32_001",
  "status": "ONLINE",
  "firmwareVersion": "1.0.0",
  "uptimeSeconds": 3600
}
```

---

## 7. Arduino IDE Setup & Verification Steps

1. Install the **ESP32 Board Support Package** (Espressif Systems) in Arduino IDE.
2. Select the target ESP32 board model and COM port.
3. Install the **MFRC522** library (e.g., by Miguel Balboa) and **ArduinoJson** library.
4. Verify 3.3 V SPI wiring against Section 3 before connecting USB power.
5. Open Serial Monitor at `115200` baud, scan a known 13.56 MHz RFID card, and verify the uppercase hex UID string (`^[0-9A-F]{8,20}$`).

---

## 8. Troubleshooting & Demonstration Safety

- **Card Not Detected:** Confirm 13.56 MHz ISO14443A tag compatibility, 3.3 V power on `3V3`, common `GND`, and that `SDA` is wired to `GPIO 5` (`SS`) and `RST` to `GPIO 22`.
- **Analog Sensor Fails When Wi-Fi Connects:** Verify the sensor is connected to an **`ADC1`** pin (`GPIO 32–39`), not an `ADC2` pin.
- **Demonstration Safety Rule:** Never create dangerous open fires or toxic smoke in an indoor demonstration room. Use safe, controlled test triggers (such as an IR remote/LED or brief safe test source approved by lab supervisors, or the hardware potentiometer/simulated test mode) and clearly state that the sensors are supplementary prototype demonstration modules.
