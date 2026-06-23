package com.aiphoneenglish

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.lang.ref.WeakReference

object NativeCallEvents {
  private var contextRef: WeakReference<ReactApplicationContext>? = null

  fun attach(context: ReactApplicationContext) {
    contextRef = WeakReference(context)
  }

  fun emit(name: String, payload: Map<String, Any?>) {
    contextRef?.get()
      ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      ?.emit(name, payload)
  }
}
