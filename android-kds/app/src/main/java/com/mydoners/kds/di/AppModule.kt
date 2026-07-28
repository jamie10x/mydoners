package com.mydoners.kds.di

import com.mydoners.kds.core.audio.AlertPlayer
import com.mydoners.kds.core.config.DeviceConfig
import com.mydoners.kds.core.config.ThemePreferences
import com.mydoners.kds.core.network.HttpClientFactory
import com.mydoners.kds.core.network.RealtimeClient
import com.mydoners.kds.core.printer.StubThermalPrinter
import com.mydoners.kds.core.printer.ThermalPrinter
import com.mydoners.kds.data.remote.OrderApi
import com.mydoners.kds.data.repository.OrderRepositoryImpl
import com.mydoners.kds.domain.repository.OrderRepository
import com.mydoners.kds.presentation.history.HistoryViewModel
import com.mydoners.kds.presentation.kds.KdsViewModel
import com.mydoners.kds.presentation.sales.SalesViewModel
import com.mydoners.kds.presentation.theme.ThemeViewModel
import org.koin.androidx.viewmodel.dsl.viewModelOf
import org.koin.core.module.dsl.bind
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val kdsCoreModule = module {
    singleOf(::DeviceConfig)
    singleOf(::ThemePreferences)
    singleOf(::AlertPlayer)
    singleOf(::StubThermalPrinter) { bind<ThermalPrinter>() }
    single { HttpClientFactory.create(get()) }
    singleOf(::RealtimeClient)
}

val kdsDataModule = module {
    singleOf(::OrderApi)
    singleOf(::OrderRepositoryImpl) { bind<OrderRepository>() }
}

val kdsPresentationModule = module {
    viewModelOf(::KdsViewModel)
    viewModelOf(::HistoryViewModel)
    viewModelOf(::SalesViewModel)
    viewModelOf(::ThemeViewModel)
}
