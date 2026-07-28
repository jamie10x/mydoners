package com.mydoners.kds.presentation.components

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import org.maplibre.android.annotations.MarkerOptions
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapView

// Same free, keyless OpenFreeMap style the Mini App's MapPicker uses via
// maplibre-gl JS — this is its native-Android equivalent.
private const val MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty"

/**
 * Read-only delivery-location map for the order card's expanded detail —
 * no drag/edit, kitchen is just sanity-checking the address, not routing
 * there (that's the courier's job). Only ever composed while a card is
 * expanded, so its MapView's lifecycle is tied 1:1 to that, not recycled
 * across grid scrolling.
 */
@Composable
fun DeliveryMap(latitude: Double, longitude: Double, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val mapView = remember { MapView(context) }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START -> mapView.onStart()
                Lifecycle.Event.ON_RESUME -> mapView.onResume()
                Lifecycle.Event.ON_PAUSE -> mapView.onPause()
                Lifecycle.Event.ON_STOP -> mapView.onStop()
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            mapView.onDestroy()
        }
    }

    AndroidView(
        modifier = modifier.clip(RoundedCornerShape(14.dp)),
        factory = {
            mapView.onCreate(null)
            mapView.getMapAsync { map ->
                map.cameraPosition = CameraPosition.Builder()
                    .target(LatLng(latitude, longitude))
                    .zoom(15.0)
                    .build()
                map.setStyle(MAP_STYLE_URL) {
                    map.addMarker(MarkerOptions().position(LatLng(latitude, longitude)))
                }
            }
            mapView
        },
    )
}
