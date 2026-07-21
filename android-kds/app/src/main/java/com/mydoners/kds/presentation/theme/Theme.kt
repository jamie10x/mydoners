package com.mydoners.kds.presentation.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// High-contrast palette for a wall-mounted kitchen tablet viewed from a
// distance under bright kitchen lighting — dark background, saturated
// status colors, no subtlety needed (or wanted) here.
val KdsBackground = Color(0xFF121212)
val KdsSurface = Color(0xFF1E1E1E)
val KdsBrand = Color(0xFFE2231A)
val KdsWarning = Color(0xFFFFB300)
val KdsSuccess = Color(0xFF2ECC71)
val KdsOnSurface = Color(0xFFF5F5F5)

private val KdsColorScheme = darkColorScheme(
    primary = KdsBrand,
    secondary = KdsWarning,
    tertiary = KdsSuccess,
    background = KdsBackground,
    surface = KdsSurface,
    onBackground = KdsOnSurface,
    onSurface = KdsOnSurface,
)

@Composable
fun MyDonersKdsTheme(content: @Composable () -> Unit) {
    // Always dark, high-contrast — this is a fixed kitchen-display
    // requirement, not a user/system preference to follow.
    MaterialTheme(colorScheme = KdsColorScheme, content = content)
}
