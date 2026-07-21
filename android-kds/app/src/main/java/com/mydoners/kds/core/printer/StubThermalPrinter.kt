package com.mydoners.kds.core.printer

import android.util.Log
import com.mydoners.kds.domain.model.Order

/** Placeholder — see [ThermalPrinter]. Logs instead of printing until real hardware is pinned. */
class StubThermalPrinter : ThermalPrinter {
    override suspend fun printReceipt(order: Order): Boolean {
        Log.i("StubThermalPrinter", "Would print receipt for order #${order.id} (no printer hardware configured yet)")
        return false
    }
}
