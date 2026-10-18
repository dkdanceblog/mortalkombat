package ru.dkdance.rnv;

import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/** Full-screen WebView with the game inside. Files come from assets/www via a fake https origin,
 *  the handheld's buttons are read natively and handed to the page as window.__nativePad. */
public class MainActivity extends Activity {
  private static final String HOST = "appassets.androidplatform.net";
  private WebView web;
  private final boolean[] btn = new boolean[17];   // from key events
  private final boolean[] axb = new boolean[17];   // from hat / trigger axes
  private float ax = 0, ay = 0;
  private static final Map<String, String> MIME = new HashMap<>();
  static {
    MIME.put("html", "text/html"); MIME.put("js", "application/javascript"); MIME.put("css", "text/css");
    MIME.put("json", "application/json"); MIME.put("webmanifest", "application/manifest+json");
    MIME.put("png", "image/png"); MIME.put("webp", "image/webp"); MIME.put("jpg", "image/jpeg"); MIME.put("ico", "image/x-icon");
    MIME.put("svg", "image/svg+xml"); MIME.put("mp3", "audio/mpeg"); MIME.put("ogg", "audio/ogg"); MIME.put("m4a", "audio/mp4");
    MIME.put("wav", "audio/wav"); MIME.put("woff2", "font/woff2"); MIME.put("woff", "font/woff"); MIME.put("ttf", "font/ttf");
  }

  @Override protected void onCreate(Bundle b) {
    super.onCreate(b);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    if (Build.VERSION.SDK_INT >= 28) getWindow().getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
    web = new WebView(this);
    web.setBackgroundColor(0xff0b0820);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setAllowFileAccess(false);
    s.setCacheMode(WebSettings.LOAD_NO_CACHE);
    web.setWebViewClient(new WebViewClient() {
      @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
        if (!HOST.equals(r.getUrl().getHost())) return null;
        String path = r.getUrl().getPath();
        if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
        try {
          InputStream in = getAssets().open("www" + path);
          int dot = path.lastIndexOf('.');
          String ext = dot >= 0 ? path.substring(dot + 1).toLowerCase() : "";
          String mime = MIME.containsKey(ext) ? MIME.get(ext) : "application/octet-stream";
          WebResourceResponse res = new WebResourceResponse(mime, "utf-8", in);
          Map<String, String> h = new HashMap<>();
          h.put("Access-Control-Allow-Origin", "*");
          res.setResponseHeaders(h);
          return res;
        } catch (Exception e) {
          return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", null, null);
        }
      }
    });
    setContentView(web);
    web.loadUrl("https://" + HOST + "/index.html?apk");
    hideBars();
  }

  private void hideBars() {
    web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
  }

  @Override public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) hideBars(); }
  @Override protected void onPause() { super.onPause(); if (web != null) web.onPause(); }
  @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); hideBars(); }

  private static int index(int code) {
    switch (code) {
      case KeyEvent.KEYCODE_BUTTON_A: return 0;
      case KeyEvent.KEYCODE_BUTTON_B: return 1;
      case KeyEvent.KEYCODE_BUTTON_X: return 2;
      case KeyEvent.KEYCODE_BUTTON_Y: return 3;
      case KeyEvent.KEYCODE_BUTTON_L1: return 4;
      case KeyEvent.KEYCODE_BUTTON_R1: return 5;
      case KeyEvent.KEYCODE_BUTTON_L2: return 6;
      case KeyEvent.KEYCODE_BUTTON_R2: return 7;
      case KeyEvent.KEYCODE_BUTTON_SELECT: return 8;
      case KeyEvent.KEYCODE_BUTTON_START: return 9;
      case KeyEvent.KEYCODE_BUTTON_THUMBL: return 10;
      case KeyEvent.KEYCODE_BUTTON_THUMBR: return 11;
      case KeyEvent.KEYCODE_DPAD_UP: return 12;
      case KeyEvent.KEYCODE_DPAD_DOWN: return 13;
      case KeyEvent.KEYCODE_DPAD_LEFT: return 14;
      case KeyEvent.KEYCODE_DPAD_RIGHT: return 15;
      case KeyEvent.KEYCODE_DPAD_CENTER: return 0;
      case KeyEvent.KEYCODE_BUTTON_MODE: return 16;
    }
    return -1;
  }

  private boolean fromPad(int src) {
    return (src & InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD
        || (src & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK
        || (src & InputDevice.SOURCE_DPAD) == InputDevice.SOURCE_DPAD;
  }

  private void push() {
    StringBuilder sb = new StringBuilder("window.__nativePad={b:[");
    for (int i = 0; i < btn.length; i++) { if (i > 0) sb.append(','); sb.append(btn[i] || axb[i] ? '1' : '0'); }
    sb.append("],a:[").append(ax).append(',').append(ay).append("]};");
    web.evaluateJavascript(sb.toString(), null);
  }

  @Override public boolean dispatchKeyEvent(KeyEvent e) {
    int code = e.getKeyCode();
    int i = index(code);
    if (i >= 0 && (fromPad(e.getSource()) || code >= KeyEvent.KEYCODE_BUTTON_A)) {
      if (e.getAction() == KeyEvent.ACTION_DOWN) { if (e.getRepeatCount() == 0) { btn[i] = true; push(); } }
      else if (e.getAction() == KeyEvent.ACTION_UP) { btn[i] = false; push(); }
      return true;
    }
    if (code == KeyEvent.KEYCODE_BACK) {
      // system back (gesture / B on some firmwares): НАЗАД in the game, never close the app
      if (e.getAction() == KeyEvent.ACTION_UP) {
        if (fromPad(e.getSource())) { btn[1] = false; push(); }
        else web.evaluateJavascript("try{navQueue.push({type:'back',player:-1})}catch(e){}", null);
      } else if (e.getAction() == KeyEvent.ACTION_DOWN && e.getRepeatCount() == 0 && fromPad(e.getSource())) { btn[1] = true; push(); }
      return true;
    }
    return super.dispatchKeyEvent(e);
  }

  @Override public boolean dispatchGenericMotionEvent(MotionEvent e) {
    if (fromPad(e.getSource()) && e.getAction() == MotionEvent.ACTION_MOVE) {
      ax = e.getAxisValue(MotionEvent.AXIS_X);
      ay = e.getAxisValue(MotionEvent.AXIS_Y);
      float hx = e.getAxisValue(MotionEvent.AXIS_HAT_X), hy = e.getAxisValue(MotionEvent.AXIS_HAT_Y);
      float lt = Math.max(e.getAxisValue(MotionEvent.AXIS_LTRIGGER), e.getAxisValue(MotionEvent.AXIS_BRAKE));
      float rt = Math.max(e.getAxisValue(MotionEvent.AXIS_RTRIGGER), e.getAxisValue(MotionEvent.AXIS_GAS));
      axb[14] = hx < -0.5f; axb[15] = hx > 0.5f; axb[12] = hy < -0.5f; axb[13] = hy > 0.5f;
      axb[6] = lt > 0.5f; axb[7] = rt > 0.5f;
      push();
      return true;
    }
    return super.dispatchGenericMotionEvent(e);
  }

  @Override public void onBackPressed() { /* handled in dispatchKeyEvent */ }
}
