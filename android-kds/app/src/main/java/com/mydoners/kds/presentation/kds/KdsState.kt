package com.mydoners.kds.presentation.kds

import com.mydoners.kds.domain.model.Order

data class KdsState(
    val orders: List<Order> = emptyList(),
    val isLoading: Boolean = true,
    val isConnected: Boolean = false,
    val isAlerting: Boolean = false,
)
