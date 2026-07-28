package com.mydoners.kds.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mydoners.kds.presentation.theme.KdsSuccess
import com.mydoners.kds.presentation.theme.KdsWarning
import kotlinx.coroutines.delay
import java.time.Duration
import java.time.Instant

private val FRESH = KdsSuccess
private val AGING = KdsWarning
private val STALE = Color(0xFFE2231A) // KdsBrand — reused for "needs attention now"

/**
 * "2m ago" / "1h 14m ago", color-shifting as the order waits — a kitchen
 * glancing at the grid should be able to tell "just placed" from "sitting
 * for 15 minutes" without doing the subtraction themselves. Self-ticking so
 * it stays accurate without the parent screen re-fetching anything.
 */
@Composable
fun ElapsedTimeChip(createdAt: String) {
    var elapsed by remember(createdAt) { mutableStateOf(elapsedSince(createdAt)) }

    LaunchedEffect(createdAt) {
        while (true) {
            delay(15_000)
            elapsed = elapsedSince(createdAt)
        }
    }

    val minutes = elapsed.toMinutes()
    val color = when {
        minutes < 5 -> FRESH
        minutes < 15 -> AGING
        else -> STALE
    }

    Text(
        text = formatElapsed(elapsed),
        fontSize = 13.sp,
        fontWeight = FontWeight.Bold,
        color = Color.White,
        modifier = Modifier
            .background(color, RoundedCornerShape(20.dp))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    )
}

private fun elapsedSince(iso: String): Duration = try {
    Duration.between(Instant.parse(iso), Instant.now())
} catch (e: Exception) {
    Duration.ZERO
}

private fun formatElapsed(duration: Duration): String {
    val minutes = duration.toMinutes()
    if (minutes < 1) return "just now"
    val hours = minutes / 60
    val remMinutes = minutes % 60
    return if (hours > 0) "${hours}h ${remMinutes}m ago" else "${minutes}m ago"
}
