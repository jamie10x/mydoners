package com.mydoners.kds.presentation.kds

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mydoners.kds.core.audio.AlertPlayer
import com.mydoners.kds.core.onFailure
import com.mydoners.kds.core.onSuccess
import com.mydoners.kds.core.printer.ThermalPrinter
import com.mydoners.kds.domain.model.ChangedBy
import com.mydoners.kds.domain.model.Order
import com.mydoners.kds.domain.model.OrderStatus
import com.mydoners.kds.domain.model.RealtimeEvent
import com.mydoners.kds.domain.repository.OrderRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class KdsViewModel(
    private val orderRepository: OrderRepository,
    private val alertPlayer: AlertPlayer,
    private val thermalPrinter: ThermalPrinter,
) : ViewModel() {

    private val _state = MutableStateFlow(KdsState())
    val state = _state.asStateFlow()

    private val _events = Channel<KdsEvent>()
    val events = _events.receiveAsFlow()

    init {
        loadActiveOrders()
        loadTodaySummary()
        observeRealtime()
    }

    fun onAction(action: KdsAction) {
        when (action) {
            is KdsAction.OnAcceptOrder -> transition(action.orderId, OrderStatus.CONFIRMED)
            is KdsAction.OnStartCooking -> transition(action.orderId, OrderStatus.COOKING, printOnSuccess = true)
            is KdsAction.OnMarkReady -> transition(action.orderId, OrderStatus.READY_FOR_DELIVERY)
            is KdsAction.OnCancelOrder -> transition(action.orderId, OrderStatus.CANCELLED)
            KdsAction.OnRetryConnection -> loadActiveOrders()
        }
    }

    private fun loadActiveOrders() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            orderRepository.fetchActiveOrders()
                .onSuccess { orders ->
                    _state.update { it.copy(orders = orders, isLoading = false) }
                    syncAlert()
                }
                .onFailure { error ->
                    _state.update { it.copy(isLoading = false) }
                    _events.send(KdsEvent.ShowError("Couldn't load orders: $error"))
                }
        }
    }

    // Best-effort ambient stat — failures are silently ignored (the top bar
    // just shows nothing) rather than surfaced as an error banner; this is
    // background context, not something that blocks kitchen work.
    private fun loadTodaySummary() {
        viewModelScope.launch {
            orderRepository.fetchTodaySummary().onSuccess { summary ->
                _state.update { it.copy(todaySummary = summary) }
            }
        }
    }

    private fun observeRealtime() {
        viewModelScope.launch {
            orderRepository.observeRealtimeEvents().collect { event ->
                when (event) {
                    // Refetch on every (re)connect: any order created or
                    // changed while the socket was down produced no event,
                    // so the current grid may be stale. The extra load on
                    // first connect is a harmless idempotent replace.
                    RealtimeEvent.Connected -> {
                        _state.update { it.copy(isConnected = true) }
                        loadActiveOrders()
                    }
                    RealtimeEvent.Disconnected -> _state.update { it.copy(isConnected = false) }
                    is RealtimeEvent.OrderCreated -> refreshOrder(event.orderId)
                    is RealtimeEvent.OrderStatusChanged -> refreshOrder(event.orderId)
                    is RealtimeEvent.OrderCancelled -> removeOrder(event.orderId)
                }
            }
        }
    }

    private fun refreshOrder(orderId: Int) {
        viewModelScope.launch {
            orderRepository.fetchOrder(orderId).onSuccess { order ->
                _state.update { current ->
                    val isActive = order.status in ACTIVE_STATUSES
                    val withoutOrder = current.orders.filterNot { it.id == order.id }
                    current.copy(orders = if (isActive) withoutOrder + order else withoutOrder)
                }
                syncAlert()
                loadTodaySummary()
            }
        }
    }

    private fun removeOrder(orderId: Int) {
        _state.update { it.copy(orders = it.orders.filterNot { order -> order.id == orderId }) }
        syncAlert()
        loadTodaySummary()
    }

    private fun transition(orderId: Int, newStatus: OrderStatus, printOnSuccess: Boolean = false) {
        viewModelScope.launch {
            orderRepository.updateStatus(orderId, newStatus, ChangedBy.KITCHEN)
                .onSuccess { order ->
                    _state.update { current ->
                        val isActive = order.status in ACTIVE_STATUSES
                        val withoutOrder = current.orders.filterNot { it.id == order.id }
                        current.copy(orders = if (isActive) withoutOrder + order else withoutOrder)
                    }
                    syncAlert()
                    loadTodaySummary()
                    if (printOnSuccess) thermalPrinter.printReceipt(order)
                }
                .onFailure { error -> _events.send(KdsEvent.ShowError("Update failed: $error")) }
        }
    }

    /** Alarm rings as long as at least one order is PENDING (needs the kitchen's accept/reject) — stops the moment none are. */
    private fun syncAlert() {
        val shouldAlert = _state.value.orders.any { it.status == OrderStatus.PENDING }
        if (shouldAlert) alertPlayer.start() else alertPlayer.stop()
        _state.update { it.copy(isAlerting = shouldAlert) }
    }

    override fun onCleared() {
        alertPlayer.stop()
    }

    private companion object {
        val ACTIVE_STATUSES =
            setOf(OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.COOKING, OrderStatus.READY_FOR_DELIVERY)
    }
}
