package com.mydoners.kds.presentation.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mydoners.kds.core.onFailure
import com.mydoners.kds.core.onSuccess
import com.mydoners.kds.domain.model.Order
import com.mydoners.kds.domain.repository.OrderRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class HistoryState(
    val orders: List<Order> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
)

/**
 * Deliberately light — today's completed/cancelled orders only, no
 * date-range picker or charts. That deeper analysis lives in the admin
 * dashboard; a kitchen tablet mid-shift just needs "what happened today."
 */
class HistoryViewModel(private val orderRepository: OrderRepository) : ViewModel() {

    private val _state = MutableStateFlow(HistoryState())
    val state = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            orderRepository.fetchTodayHistory()
                .onSuccess { orders -> _state.update { it.copy(orders = orders, isLoading = false) } }
                .onFailure { error -> _state.update { it.copy(isLoading = false, error = error.toString()) } }
        }
    }
}
