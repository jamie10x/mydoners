package com.mydoners.kds.presentation.navigation

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.mydoners.kds.presentation.components.KdsNavRail
import com.mydoners.kds.presentation.components.KdsTopBar
import com.mydoners.kds.presentation.history.HistoryRoot
import com.mydoners.kds.presentation.kds.KdsRoot
import com.mydoners.kds.presentation.kds.KdsViewModel
import com.mydoners.kds.presentation.sales.SalesRoot
import com.mydoners.kds.presentation.theme.MyDonersKdsTheme
import com.mydoners.kds.presentation.theme.ThemeViewModel
import org.koin.androidx.compose.koinViewModel

/**
 * App-wide chrome (top bar + side nav rail + snackbar) lives here, shared
 * across all three destinations — each screen below is content-only, no
 * per-screen Scaffold. The permanent NavigationRail (not a hamburger
 * drawer) fits a wall-mounted tablet with width to spare.
 */
@Composable
fun KdsApp() {
    // Owned here (not per-screen) so KDS's realtime-driven error events and
    // the other screens can all surface into the same snackbar host.
    val kdsViewModel: KdsViewModel = koinViewModel()
    val kdsState by kdsViewModel.state.collectAsStateWithLifecycle()
    val themeViewModel: ThemeViewModel = koinViewModel()
    val isDarkTheme by themeViewModel.isDarkTheme.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route ?: KdsRoute.Orders.route

    MyDonersKdsTheme(darkTheme = isDarkTheme) {
        Scaffold(
            topBar = {
                KdsTopBar(
                    isConnected = kdsState.isConnected,
                    todaySummary = kdsState.todaySummary,
                    isDarkTheme = isDarkTheme,
                    onToggleTheme = themeViewModel::toggleTheme,
                )
            },
            snackbarHost = { SnackbarHost(snackbarHostState) },
        ) { padding ->
            Row(modifier = Modifier.fillMaxSize().padding(padding)) {
                KdsNavRail(
                    currentRoute = currentRoute,
                    onNavigate = { destination ->
                        navController.navigate(destination.route) {
                            // Standard single-top nav-rail behavior: don't
                            // stack duplicate destinations, restore state
                            // when returning to an already-visited tab.
                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                )
                NavHost(
                    navController = navController,
                    startDestination = KdsRoute.Orders.route,
                    modifier = Modifier.weight(1f),
                ) {
                    composable(KdsRoute.Orders.route) { KdsRoot(snackbarHostState, kdsViewModel) }
                    composable(KdsRoute.History.route) { HistoryRoot() }
                    composable(KdsRoute.Sales.route) { SalesRoot() }
                }
            }
        }
    }
}
