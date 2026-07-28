package com.mydoners.kds.presentation.kds

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mydoners.kds.domain.model.Order
import com.mydoners.kds.presentation.components.OrderCard
import org.koin.androidx.compose.koinViewModel

@Composable
fun KdsRoot(
    snackbarHostState: SnackbarHostState,
    viewModel: KdsViewModel = koinViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.events.collect { event ->
            when (event) {
                is KdsEvent.ShowError -> snackbarHostState.showSnackbar(event.message)
            }
        }
    }

    // Wall-mounted tablets sleep; anything that happened while this screen
    // wasn't resumed produced no visible update — refetch on every return.
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        viewModel.onAction(KdsAction.OnRetryConnection)
    }

    KdsScreen(state = state, onAction = viewModel::onAction)
}

@Composable
fun KdsScreen(state: KdsState, onAction: (KdsAction) -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        when {
            state.isLoading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            state.orders.isEmpty() -> EmptyState()
            else -> OrderGrid(orders = state.orders, onAction = onAction)
        }
    }
}

@Composable
private fun OrderGrid(orders: List<Order>, onAction: (KdsAction) -> Unit) {
    var expandedOrderId by remember { mutableStateOf<Int?>(null) }

    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 360.dp),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        items(
            items = orders,
            key = { it.id },
            // An expanded card (customer details + embedded map) needs more
            // room than the grid's normal column width — span 2 columns
            // instead of resizing every other card to make space.
            span = { order -> if (order.id == expandedOrderId) GridItemSpan(2) else GridItemSpan(1) },
        ) { order ->
            OrderCard(
                order = order,
                expanded = order.id == expandedOrderId,
                onToggleExpand = {
                    expandedOrderId = if (expandedOrderId == order.id) null else order.id
                },
                onAccept = { onAction(KdsAction.OnAcceptOrder(order.id)) },
                onStartCooking = { onAction(KdsAction.OnStartCooking(order.id)) },
                onMarkReady = { onAction(KdsAction.OnMarkReady(order.id)) },
                onCancel = { onAction(KdsAction.OnCancelOrder(order.id)) },
            )
        }
    }
}

@Composable
private fun EmptyState() {
    Text(
        text = "Faol buyurtmalar yo'q",
        fontSize = 20.sp,
        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
        modifier = Modifier.fillMaxSize().padding(32.dp),
        textAlign = TextAlign.Center,
    )
}

@Preview(widthDp = 1024, heightDp = 600)
@Composable
private fun KdsScreenPreview() {
    KdsScreen(state = KdsState(isLoading = false), onAction = {})
}
