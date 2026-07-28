plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "com.mydoners.kds"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.mydoners.kds"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"

        // Default backend URL for local development against an emulator
        // (10.0.2.2 is the emulator's alias for the host machine's localhost).
        // Override per-build via -PbackendUrl=... or a local.properties entry
        // when pointing at the real deployed backend / a physical tablet on
        // the restaurant's LAN.
        val backendUrl = (project.findProperty("backendUrl") as String?) ?: "http://10.0.2.2:3000"
        buildConfigField("String", "BACKEND_URL", "\"$backendUrl\"")

        // Default device API key for local dev only (see backend's seed script
        // output, docs/auth-contract.md #2). Overridable via -PdeviceApiKey=...
        // A real deployment sets this once via the (not-yet-built) first-run
        // setup screen, stored in DeviceConfig's DataStore — this BuildConfig
        // value is purely a local-dev convenience fallback.
        val deviceApiKey = (project.findProperty("deviceApiKey") as String?) ?: ""
        buildConfigField("String", "DEVICE_API_KEY", "\"$deviceApiKey\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = libs.versions.compose.compiler.get()
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation(libs.core.ktx)
    implementation(libs.lifecycle.runtime.ktx)
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)
    implementation(libs.activity.compose)

    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.ui.tooling.preview)
    debugImplementation(libs.compose.ui.tooling)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons.extended)

    implementation(libs.koin.android)
    implementation(libs.koin.androidx.compose)

    implementation(libs.ktor.client.core)
    implementation(libs.ktor.client.okhttp)
    implementation(libs.ktor.client.auth)
    implementation(libs.ktor.client.content.negotiation)
    implementation(libs.ktor.serialization.kotlinx.json)
    implementation(libs.ktor.client.logging)

    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.coroutines.android)

    implementation(libs.socketio.client)

    implementation(libs.datastore.preferences)

    implementation(libs.navigation.compose)
    implementation(libs.maplibre.android)
}
