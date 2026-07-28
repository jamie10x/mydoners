package com.mydoners.kds.core.format

/** "125000" -> "125 000 so'm" — space-grouped digits, matching the Mini App and backend. */
fun formatSom(amount: Number): String {
    val grouped = amount.toLong().toString().reversed().chunked(3).joinToString(" ").reversed()
    return "$grouped so'm"
}
