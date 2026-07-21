package com.mydoners.kds.core.network

import android.util.Log
import com.mydoners.kds.BuildConfig
import com.mydoners.kds.core.config.DeviceConfig
import com.mydoners.kds.domain.model.RealtimeEvent
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import org.json.JSONObject

private const val TAG = "RealtimeClient"

/**
 * Wraps the Socket.io Java client (protocol-compatible with the backend's
 * `socket.io` server — a raw WebSocket/Ktor client would not speak the same
 * framing). Connects at the HTTP path "/realtime" per docs/websocket-events.md;
 * that's Socket.io's transport `path` option, not a namespace.
 */
class RealtimeClient(private val deviceConfig: DeviceConfig) {

    fun observe(): Flow<RealtimeEvent> = callbackFlow {
        val apiKey = deviceConfig.getApiKey()

        val options = IO.Options.builder()
            .setPath("/realtime")
            .setAuth(mapOf("token" to apiKey))
            .setReconnection(true)
            .build()

        Log.i(TAG, "connecting to ${BuildConfig.BACKEND_URL} (path=/realtime)")
        val socket: Socket = IO.socket(BuildConfig.BACKEND_URL, options)

        socket.on(Socket.EVENT_CONNECT) {
            Log.i(TAG, "connected")
            trySend(RealtimeEvent.Connected)
        }
        socket.on(Socket.EVENT_DISCONNECT) { args ->
            Log.i(TAG, "disconnected: ${args.firstOrNull()}")
            trySend(RealtimeEvent.Disconnected)
        }
        socket.on(Socket.EVENT_CONNECT_ERROR) { args ->
            Log.w(TAG, "connect_error: ${args.firstOrNull()}")
            trySend(RealtimeEvent.Disconnected)
        }

        socket.on("order.created") { args -> extractOrderId(args)?.let { trySend(RealtimeEvent.OrderCreated(it)) } }
        socket.on("order.status_changed") { args ->
            extractOrderId(args)?.let { trySend(RealtimeEvent.OrderStatusChanged(it)) }
        }
        socket.on("order.cancelled") { args -> extractOrderId(args)?.let { trySend(RealtimeEvent.OrderCancelled(it)) } }

        socket.connect()

        awaitClose { socket.disconnect() }
    }

    /** Every event envelope is `{ event, orderId, timestamp, data }` — see docs/websocket-events.md. */
    private fun extractOrderId(args: Array<Any>): Int? {
        val payload = args.firstOrNull() as? JSONObject ?: return null
        return payload.optInt("orderId", -1).takeIf { it >= 0 }
    }
}
