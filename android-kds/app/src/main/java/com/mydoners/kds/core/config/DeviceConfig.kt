package com.mydoners.kds.core.config

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.mydoners.kds.BuildConfig
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "kds_config")
private val DEVICE_API_KEY = stringPreferencesKey("device_api_key")

/**
 * Holds the single kitchen tablet's device API key (docs/auth-contract.md #2).
 * There is exactly one device, so this is a plain key-value store, not a
 * per-user session — DataStore per CLAUDE.md's storage rules, never
 * SharedPreferences.
 */
class DeviceConfig(private val context: Context) {

    suspend fun getApiKey(): String {
        val stored = context.dataStore.data.map { it[DEVICE_API_KEY] }.first()
        return stored?.takeIf { it.isNotBlank() } ?: BuildConfig.DEVICE_API_KEY
    }

    suspend fun setApiKey(key: String) {
        context.dataStore.edit { it[DEVICE_API_KEY] = key }
    }
}
