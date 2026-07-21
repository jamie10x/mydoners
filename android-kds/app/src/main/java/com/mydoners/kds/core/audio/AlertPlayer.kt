package com.mydoners.kds.core.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import com.mydoners.kds.R

/**
 * Continuous audio bell for new orders — loops indefinitely until the
 * kitchen staff taps "Accept & Start Cooking", per the blueprint's KDS spec.
 * A fresh MediaPlayer is created per alert cycle rather than reused, since
 * this fires rarely (once per incoming order) and avoids MediaPlayer state
 * machine bugs from reset/prepare races under repeated start/stop calls.
 */
class AlertPlayer(private val context: Context) {

    private var mediaPlayer: MediaPlayer? = null

    fun start() {
        if (mediaPlayer != null) return // already ringing

        mediaPlayer = MediaPlayer().apply {
            setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build(),
            )
            val afd = context.resources.openRawResourceFd(R.raw.kitchen_alert)
            setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
            afd.close()
            isLooping = true
            prepare()
            start()
        }
    }

    fun stop() {
        mediaPlayer?.apply {
            stop()
            release()
        }
        mediaPlayer = null
    }

    val isPlaying: Boolean
        get() = mediaPlayer?.isPlaying == true
}
