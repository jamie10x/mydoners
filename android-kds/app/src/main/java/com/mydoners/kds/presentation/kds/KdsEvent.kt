package com.mydoners.kds.presentation.kds

sealed interface KdsEvent {
    data class ShowError(val message: String) : KdsEvent
}
