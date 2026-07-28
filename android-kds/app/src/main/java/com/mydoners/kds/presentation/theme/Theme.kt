package com.mydoners.kds.presentation.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// High-contrast palette for a wall-mounted kitchen tablet viewed from a
// distance under bright kitchen lighting — saturated status colors in both
// modes, no subtlety needed (or wanted) here. Kitchen staff pick dark or
// light via the toggle in the top bar based on their lighting/preference.
val KdsBackground = Color(0xFF121212)
val KdsSurface = Color(0xFF1E1E1E)
val KdsBrand = Color(0xFFE2231A)
val KdsWarning = Color(0xFFFFB300)
val KdsSuccess = Color(0xFF2ECC71)
val KdsOnSurface = Color(0xFFF5F5F5)

private val KdsLightBackground = Color(0xFFF7F7F7)
private val KdsLightSurface = Color(0xFFFFFFFF)
private val KdsLightOnSurface = Color(0xFF1A1A1A)

private val KdsDarkColorScheme = darkColorScheme(
    primary = KdsBrand,
    secondary = KdsWarning,
    tertiary = KdsSuccess,
    background = KdsBackground,
    surface = KdsSurface,
    onBackground = KdsOnSurface,
    onSurface = KdsOnSurface,
)

private val KdsLightColorScheme = lightColorScheme(
    primary = KdsBrand,
    secondary = KdsWarning,
    tertiary = KdsSuccess,
    background = KdsLightBackground,
    surface = KdsLightSurface,
    onBackground = KdsLightOnSurface,
    onSurface = KdsLightOnSurface,
)

@Composable
fun MyDonersKdsTheme(darkTheme: Boolean = true, content: @Composable () -> Unit) {
    val colorScheme = if (darkTheme) KdsDarkColorScheme else KdsLightColorScheme
    MaterialTheme(colorScheme = colorScheme, content = content)
}
