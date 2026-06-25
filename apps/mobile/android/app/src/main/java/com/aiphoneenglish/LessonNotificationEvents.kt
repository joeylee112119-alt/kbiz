package com.aiphoneenglish

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule

object LessonNotificationEvents {
  private var reactContext: ReactApplicationContext? = null

  fun attach(context: ReactApplicationContext) {
    reactContext = context
  }

  fun emit(name: String, data: Map<String, String>) {
    val params = Arguments.createMap()
    data.forEach { (key, value) -> params.putString(key, value) }
    reactContext
      ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      ?.emit(name, params)
  }
}
