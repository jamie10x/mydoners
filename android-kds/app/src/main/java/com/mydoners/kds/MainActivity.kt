package com.mydoners.kds

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.mydoners.kds.presentation.navigation.KdsApp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        // Kitchen tablet is wall-mounted and always-on — keep the screen
        // awake for the lifetime of this Activity rather than relying on
        // the device's own screen-timeout/lock settings.
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        setContent {
            KdsApp()
        }
    }
}
