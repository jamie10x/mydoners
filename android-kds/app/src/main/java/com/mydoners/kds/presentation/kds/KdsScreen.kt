package com.mydoners.kds.presentation.kds

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mydoners.kds.domain.model.Order
import com.mydoners.kds.presentation.components.OrderCard
import com.mydoners.kds.presentation.theme.KdsSuccess
import com.mydoners.kds.presentation.theme.MyDonersKdsTheme
import org.koin.androidx.compose.koinViewModel

@Composable
fun KdsRoot(viewModel: KdsViewModel = koinViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    // No Snackbar host wired up yet (single-screen app, Phase 1 scope) —
    // errors surface via Logcat for now rather than being silently dropped.
    LaunchedEffect(Unit) {
        viewModel.events.collect { event ->
            when (event) {
                is KdsEvent.ShowError -> Log.w("KdsScreen", event.message)
            }
        }
    }

    KdsScreen(state = state, onAction = viewModel::onAction)
}

@Composable
fun KdsScreen(state: KdsState, onAction: (KdsAction) -> Unit) {
    MyDonersKdsTheme {
        Scaffold(
            topBar = { KdsTopBar(isConnected = state.isConnected, orderCount = state.orders.size) },
        ) { padding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .background(MaterialTheme.colorScheme.background),
            ) {
                when {
                    state.isLoading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                    state.orders.isEmpty() -> EmptyState()
                    else -> OrderGrid(orders = state.orders, onAction = onAction)
                }
            }
        }
    }
}

@Composable
private fun KdsTopBar(isConnected: Boolean, orderCount: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            .padding(horizontal = 20.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text = "MyDoners Kitchen",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Row {
            Box(
                modifier = Modifier
                    .size(12.dp)
                    .background(if (isConnected) KdsSuccess else Color.Gray, CircleShape),
            )
            Text(
                text = if (isConnected) "  Live · $orderCount active" else "  Reconnecting…",
                fontSize = 16.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            )
        }
    }
}

@Composable
private fun OrderGrid(orders: List<Order>, onAction: (KdsAction) -> Unit) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 340.dp),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        items(orders, key = { it.id }) { order ->
            OrderCard(
                order = order,
                onAccept = { onAction(KdsAction.OnAcceptOrder(order.id)) },
                onMarkReady = { onAction(KdsAction.OnMarkReady(order.id)) },
                onCancel = { onAction(KdsAction.OnCancelOrder(order.id)) },
            )
        }
    }
}

@Composable
private fun EmptyState() {
    Text(
        text = "No active orders",
        fontSize = 20.sp,
        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
        modifier = Modifier.fillMaxSize().padding(32.dp),
        textAlign = TextAlign.Center,
    )
}

@Preview(widthDp = 1024, heightDp = 600)
@Composable
private fun KdsScreenPreview() {
    KdsScreen(state = KdsState(isLoading = false, isConnected = true), onAction = {})
}
