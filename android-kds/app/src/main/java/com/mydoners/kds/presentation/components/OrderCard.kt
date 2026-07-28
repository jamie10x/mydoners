package com.mydoners.kds.presentation.components

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mydoners.kds.domain.model.Order
import com.mydoners.kds.domain.model.OrderStatus
import com.mydoners.kds.domain.model.PaymentStatus
import com.mydoners.kds.domain.model.RiskLevel
import com.mydoners.kds.presentation.theme.KdsBrand
import com.mydoners.kds.presentation.theme.KdsSuccess
import com.mydoners.kds.presentation.theme.KdsWarning

@Composable
fun OrderCard(
    order: Order,
    expanded: Boolean,
    onToggleExpand: () -> Unit,
    onAccept: () -> Unit,
    onStartCooking: () -> Unit,
    onMarkReady: () -> Unit,
    onCancel: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var showCancelConfirm by remember { mutableStateOf(false) }
    val isPending = order.status == OrderStatus.PENDING

    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onToggleExpand,
            ),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = if (isPending) BorderStroke(2.dp, KdsBrand) else null,
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "#${order.id}",
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    ElapsedTimeChip(order.createdAt)
                }
                StatusBadge(order.status)
            }

            if (order.riskLevel == RiskLevel.MEDIUM) {
                Text(
                    text = "⚠ FIRST-TIME / HIGH-VALUE — double-check before accepting",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = KdsWarning,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }

            Column(modifier = Modifier.padding(top = 14.dp)) {
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
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
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
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
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

                OutlinedButton(onClick = { showCancelConfirm = true }) {
                    Text(if (isPending) "Reject" else "Cancel", fontSize = 16.sp)
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    imageVector = if (expanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                )
                Text(
                    text = if (expanded) "Less details" else "Customer & delivery details",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                )
            }

            if (expanded) {
                HorizontalDivider(modifier = Modifier.padding(top = 8.dp, bottom = 16.dp))
                OrderDetails(order)
            }
        }
    }

    if (showCancelConfirm) {
        val verb = if (isPending) "reject" else "cancel"
        AlertDialog(
            onDismissRequest = { showCancelConfirm = false },
            title = { Text("${verb.replaceFirstChar(Char::uppercase)} order #${order.id}?") },
            text = { Text("This can't be undone — the customer will be notified.") },
            confirmButton = {
                TextButton(onClick = {
                    showCancelConfirm = false
                    onCancel()
                }) { Text("Yes, $verb it", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { showCancelConfirm = false }) { Text("Never mind") }
            },
        )
    }
}

@Composable
private fun OrderDetails(order: Order) {
    val context = LocalContext.current

    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column {
                Text(
                    text = order.customerName?.takeIf { it.isNotBlank() } ?: "Unknown customer",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                order.customerPhone?.let { phone ->
                    Text(
                        text = phone,
                        fontSize = 16.sp,
                        color = KdsBrand,
                        textDecoration = TextDecoration.Underline,
                        modifier = Modifier
                            .padding(top = 2.dp)
                            .clickable {
                                context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))
                            },
                    )
                }
                order.customerTelegramUsername?.let { username ->
                    Text(
                        text = "@$username",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                        modifier = Modifier.padding(top = 2.dp),
                    )
                }
            }

            order.addressLabel?.let { label ->
                Text(
                    text = label,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    modifier = Modifier
                        .background(KdsBrand, RoundedCornerShape(20.dp))
                        .padding(horizontal = 12.dp, vertical = 5.dp),
                )
            }
        }

        Text(
            text = order.landmarkAddress,
            fontSize = 15.sp,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f),
            modifier = Modifier.padding(top = 8.dp),
        )

        DeliveryMap(
            latitude = order.latitude,
            longitude = order.longitude,
            modifier = Modifier
                .fillMaxWidth()
                .height(180.dp)
                .padding(top = 14.dp),
        )
    }
}

@Composable
private fun StatusBadge(status: OrderStatus) {
    val (label, color) = when (status) {
        OrderStatus.PENDING -> "NEW" to KdsBrand
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
