package com.mydoners.kds.presentation.theme

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mydoners.kds.core.config.ThemePreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class ThemeViewModel(private val themePreferences: ThemePreferences) : ViewModel() {

    private val _isDarkTheme = MutableStateFlow(true)
    val isDarkTheme = _isDarkTheme.asStateFlow()

    init {
        viewModelScope.launch {
            themePreferences.isDarkTheme.collect { _isDarkTheme.value = it }
        }
    }

    fun toggleTheme() {
        val next = !_isDarkTheme.value
        _isDarkTheme.value = next
        viewModelScope.launch { themePreferences.setDarkTheme(next) }
    }
}
