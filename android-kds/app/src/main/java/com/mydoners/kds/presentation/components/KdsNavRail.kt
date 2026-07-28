package com.mydoners.kds.presentation.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.History
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.mydoners.kds.presentation.navigation.KdsRoute
import com.mydoners.kds.presentation.navigation.kdsRoutes

// A permanently-visible side rail, not a hamburger-triggered drawer — this
// tablet is wall-mounted with plenty of width to spare, so navigation
// should never be hidden behind an extra tap.
@Composable
fun KdsNavRail(
    currentRoute: String,
    onNavigate: (KdsRoute) -> Unit,
    modifier: Modifier = Modifier,
) {
    NavigationRail(modifier = modifier, containerColor = MaterialTheme.colorScheme.surface) {
        kdsRoutes.forEach { destination ->
            NavigationRailItem(
                selected = currentRoute == destination.route,
                onClick = { onNavigate(destination) },
                icon = { Icon(destination.icon(), contentDescription = destination.label) },
                label = { Text(destination.label) },
            )
        }
    }
}

private fun KdsRoute.icon() = when (this) {
    KdsRoute.Orders -> Icons.AutoMirrored.Filled.ReceiptLong
    KdsRoute.History -> Icons.Filled.History
    KdsRoute.Sales -> Icons.AutoMirrored.Filled.TrendingUp
}
