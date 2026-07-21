package com.mydoners.kds.core.printer

import com.mydoners.kds.domain.model.Order

/**
 * ESC/POS receipt printing over Bluetooth SPP or USB serial.
 *
 * NOT implemented against real hardware yet — per docs/decisions.md #4, the
 * exact printer model/connection type (Bluetooth SPP vs USB serial, which
 * have different Android permission models and driver code paths) needs to
 * be pinned to a device the restaurant actually buys before this can be
 * built for real. [StubThermalPrinter] exists so the rest of the app (the
 * KDS ViewModel calling `printReceipt` on order acceptance) doesn't need to
 * change shape once a real implementation lands.
 */
interface ThermalPrinter {
    suspend fun printReceipt(order: Order): Boolean
}
