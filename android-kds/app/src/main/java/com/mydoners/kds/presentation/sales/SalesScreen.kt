package com.mydoners.kds.presentation.sales

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
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
import com.mydoners.kds.core.format.formatSom
import com.mydoners.kds.domain.model.SalesSummary
import com.mydoners.kds.presentation.theme.KdsBrand
import org.koin.androidx.compose.koinViewModel

@Composable
fun SalesRoot(viewModel: SalesViewModel = koinViewModel()) {
    val state by viewModel.state.collectAsState()
    SalesScreen(summary = state.summary, isLoading = state.isLoading, error = state.error)
}

@Composable
private fun SalesScreen(summary: SalesSummary?, isLoading: Boolean, error: String?) {
    Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        when {
            isLoading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            error != null -> Text(
                text = "Bugungi savdoni yuklab bo'lmadi: $error",
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f),
                modifier = Modifier.align(Alignment.Center).padding(32.dp),
            )
            summary == null -> {}
            else -> Column(modifier = Modifier.padding(32.dp)) {
                Text(
                    text = "Bugungi savdo",
                    fontSize = 26.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Row(modifier = Modifier.padding(top = 20.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    StatCard(label = "Bugungi buyurtmalar", value = summary.orderCount.toString())
                    StatCard(label = "Bugungi tushum", value = formatSom(summary.revenue))
                }

                if (summary.topItems.isNotEmpty()) {
                    Text(
                        text = "Bugungi top mahsulotlar",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.8f),
                        modifier = Modifier.padding(top = 28.dp, bottom = 10.dp),
                    )
                    Column(
                        modifier = Modifier
                            .fillMaxWidth(0.6f)
                            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(14.dp))
                            .padding(vertical = 6.dp),
                    ) {
                        summary.topItems.forEach { item ->
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text(item.productName, fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurface)
                                Text(
                                    "${item.quantity}×",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = KdsBrand,
                                )
                            }
                        }
                    }
                } else {
                    Text(
                        text = "Bugun hali buyurtma yo'q",
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.4f),
                        modifier = Modifier.padding(top = 28.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun StatCard(label: String, value: String) {
    Column(
        modifier = Modifier
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(16.dp))
            .padding(horizontal = 24.dp, vertical = 18.dp),
    ) {
        Text(
            text = value,
            fontSize = 30.sp,
            fontWeight = FontWeight.Bold,
            color = KdsBrand,
        )
        Text(
            text = label,
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
        )
    }
}
