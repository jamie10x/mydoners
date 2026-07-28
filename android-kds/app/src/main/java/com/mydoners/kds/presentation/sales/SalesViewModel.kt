package com.mydoners.kds.presentation.sales

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mydoners.kds.core.onFailure
import com.mydoners.kds.core.onSuccess
import com.mydoners.kds.domain.model.SalesSummary
import com.mydoners.kds.domain.repository.OrderRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SalesState(
    val summary: SalesSummary? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
)

class SalesViewModel(private val orderRepository: OrderRepository) : ViewModel() {

    private val _state = MutableStateFlow(SalesState())
    val state = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            orderRepository.fetchTodaySummary()
                .onSuccess { summary -> _state.update { it.copy(summary = summary, isLoading = false) } }
                .onFailure { error -> _state.update { it.copy(isLoading = false, error = error.toString()) } }
        }
    }
}
