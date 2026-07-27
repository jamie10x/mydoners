package com.mydoners.kds.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mydoners.kds.domain.model.Order
import com.mydoners.kds.domain.model.OrderStatus
import com.mydoners.kds.domain.model.PaymentStatus
import com.mydoners.kds.domain.model.RiskLevel
import com.mydoners.kds.presentation.theme.KdsSuccess
import com.mydoners.kds.presentation.theme.KdsWarning

@Composable
fun OrderCard(
    order: Order,
    onAccept: () -> Unit,
    onStartCooking: () -> Unit,
    onMarkReady: () -> Unit,
    onCancel: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = "#${order.id}",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                StatusBadge(order.status)
            }

            if (order.riskLevel == RiskLevel.MEDIUM) {
                Text(
                    text = "⚠ NEEDS VERBAL CONFIRMATION",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = KdsWarning,
                    modifier = Modifier.padding(top = 6.dp),
                )
            }

            Column(modifier = Modifier.padding(top = 12.dp)) {
                order.items.forEach { item ->
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(
                            text = buildString {
                                append("${item.quantity}× ${item.productName}")
                                item.selectedVariant?.let { append(" — ${it.uppercase()}") }
                            },
                            fontSize = 20.sp,
                            fontWeight = if (item.selectedVariant != null) FontWeight.Bold else FontWeight.Normal,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                    }
                }
            }

            if (!order.courierNotes.isNullOrBlank()) {
                Text(
                    text = "📝 ${order.courierNotes}",
                    fontSize = 16.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    modifier = Modifier.padding(top = 10.dp),
                )
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = order.paymentType.name,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (order.paymentStatus == PaymentStatus.PAID) KdsSuccess else KdsWarning,
                )
                Text(
                    text = "${order.totalAmount.toLong()} UZS",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                when (order.status) {
                    OrderStatus.PENDING -> Button(
                        onClick = onAccept,
                        modifier = Modifier.fillMaxWidth(0.6f),
                        colors = ButtonDefaults.buttonColors(containerColor = KdsSuccess),
                    ) { Text("ACCEPT ORDER", fontSize = 18.sp, fontWeight = FontWeight.Bold) }

                    OrderStatus.CONFIRMED -> Button(
                        onClick = onStartCooking,
                        modifier = Modifier.fillMaxWidth(0.6f),
                        colors = ButtonDefaults.buttonColors(containerColor = KdsSuccess),
                    ) { Text("START COOKING", fontSize = 18.sp, fontWeight = FontWeight.Bold) }

                    OrderStatus.COOKING -> Button(
                        onClick = onMarkReady,
                        modifier = Modifier.fillMaxWidth(0.6f),
                        colors = ButtonDefaults.buttonColors(containerColor = KdsWarning),
                    ) { Text("READY FOR DELIVERY", fontSize = 18.sp, fontWeight = FontWeight.Bold) }

                    else -> {}
                }

                OutlinedButton(onClick = onCancel) {
                    Text(if (order.status == OrderStatus.PENDING) "Reject" else "Cancel", fontSize = 16.sp)
                }
            }
        }
    }
}

@Composable
private fun StatusBadge(status: OrderStatus) {
    val (label, color) = when (status) {
        OrderStatus.PENDING -> "NEW" to MaterialTheme.colorScheme.primary
        OrderStatus.CONFIRMED -> "ACCEPTED" to KdsSuccess
        OrderStatus.COOKING -> "COOKING" to KdsWarning
        OrderStatus.READY_FOR_DELIVERY -> "READY" to KdsSuccess
        else -> status.name to Color.Gray
    }
    Text(
        text = label,
        fontSize = 14.sp,
        fontWeight = FontWeight.Bold,
        color = Color.White,
        modifier = Modifier
            .background(color, RoundedCornerShape(8.dp))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    )
}
