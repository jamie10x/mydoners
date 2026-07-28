package com.mydoners.kds.presentation.kds

import com.mydoners.kds.domain.model.Order
import com.mydoners.kds.domain.model.SalesSummary

data class KdsState(
    val orders: List<Order> = emptyList(),
    val isLoading: Boolean = true,
    val isConnected: Boolean = false,
    val isAlerting: Boolean = false,
    // Ambient today-strip in the top bar — light on purpose (see Sales
    // screen for the fuller view). Null until the first successful fetch;
    // a failure here is not worth surfacing as an error, just leave it blank.
    val todaySummary: SalesSummary? = null,
)
