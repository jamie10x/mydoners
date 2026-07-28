package com.mydoners.kds.presentation.navigation

/** The three destinations behind the side nav rail — see docs/decisions.md. */
sealed class KdsRoute(val route: String, val label: String) {
    data object Orders : KdsRoute("orders", "Buyurtmalar")
    data object History : KdsRoute("history", "Tarix")
    data object Sales : KdsRoute("sales", "Bugungi savdo")
}

// Deliberately NOT a member of KdsRoute's own companion object: a sealed
// class's data-object subclasses and a same-class companion referencing
// them can hit JVM static-initialization ordering issues (the companion's
// list gets built with null entries because the subclass singletons
// haven't finished constructing yet). Top-level avoids the circularity.
val kdsRoutes: List<KdsRoute> = listOf(KdsRoute.Orders, KdsRoute.History, KdsRoute.Sales)
