package com.mydoners.kds.core.config

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

// Separate file from DeviceConfig's "kds_config" DataStore — Android only
// allows one DataStore instance per file name for the process lifetime.
private val Context.themeDataStore by preferencesDataStore(name = "kds_theme")
private val IS_DARK_THEME = booleanPreferencesKey("is_dark_theme")

/**
 * Persists the kitchen tablet's light/dark theme choice across restarts.
 * Defaults to dark (the original fixed design) until the kitchen staff
 * actively toggles it.
 */
class ThemePreferences(private val context: Context) {

    val isDarkTheme: Flow<Boolean> = context.themeDataStore.data.map { it[IS_DARK_THEME] ?: true }

    suspend fun setDarkTheme(isDark: Boolean) {
        context.themeDataStore.edit { it[IS_DARK_THEME] = isDark }
    }
}
