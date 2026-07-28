package com.mydoners.kds

import android.app.Application
import com.mydoners.kds.di.kdsCoreModule
import com.mydoners.kds.di.kdsDataModule
import com.mydoners.kds.di.kdsPresentationModule
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.startKoin
import org.maplibre.android.MapLibre

class KdsApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Keyless — OpenFreeMap needs no token, unlike the old Mapbox SDK
        // this API is descended from. Must run before any MapView is created.
        MapLibre.getInstance(this)
        startKoin {
            androidContext(this@KdsApp)
            modules(kdsCoreModule, kdsDataModule, kdsPresentationModule)
        }
    }
}
