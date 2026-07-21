package com.mydoners.kds

import android.app.Application
import com.mydoners.kds.di.kdsCoreModule
import com.mydoners.kds.di.kdsDataModule
import com.mydoners.kds.di.kdsPresentationModule
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.startKoin

class KdsApp : Application() {
    override fun onCreate() {
        super.onCreate()
        startKoin {
            androidContext(this@KdsApp)
            modules(kdsCoreModule, kdsDataModule, kdsPresentationModule)
        }
    }
}
