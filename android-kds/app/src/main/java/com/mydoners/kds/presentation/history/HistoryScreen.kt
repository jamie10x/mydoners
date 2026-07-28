package com.mydoners.kds.presentation.history

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mydoners.kds.domain.model.Order
import com.mydoners.kds.domain.model.OrderStatus
import com.mydoners.kds.presentation.theme.KdsSuccess
import org.koin.androidx.compose.koinViewModel

@Composable
fun HistoryRoot(viewModel: HistoryViewModel = koinViewModel()) {
    val state by viewModel.state.collectAsState()
    HistoryScreen(orders = state.orders, isLoading = state.isLoading, error = state.error)
}

@Composable
private fun HistoryScreen(orders: List<Order>, isLoading: Boolean, error: String?) {
    Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        when {
            isLoading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            error != null -> Text(
                text = "Couldn't load history: $error",
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f),
                modifier = Modifier.align(Alignment.Center).padding(32.dp),
            )
            orders.isEmpty() -> Text(
                text = "No completed or cancelled orders yet today",
                fontSize = 18.sp,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.4f),
                modifier = Modifier.align(Alignment.Center).padding(32.dp),
            )
            else -> LazyColumn(
                contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(orders, key = { it.id }) { order -> HistoryRow(order) }
            }
        }
    }
}

@Composable
private fun HistoryRow(order: Order) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(14.dp))
            .padding(horizontal = 18.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Column {
            Text(
                text = "#${order.id}",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = order.items.joinToString(", ") { "${it.quantity}× ${it.productName}" },
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            )
        }
        Column(horizontalAlignment = androidx.compose.ui.Alignment.End) {
            Text(
                text = if (order.status == OrderStatus.DELIVERED) "DELIVERED" else "CANCELLED",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = if (order.status == OrderStatus.DELIVERED) KdsSuccess else MaterialTheme.colorScheme.error,
            )
            Text(
                text = "${order.totalAmount.toLong()} UZS",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}
