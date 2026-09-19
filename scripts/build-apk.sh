#!/usr/bin/env bash
set -e

echo "=== Building AnimStudio Android APK (Strict Portrait Orientation) ==="

# 1. Clean previous APK artifacts and build Vite web bundle
rm -f public/AnimStudio.apk public/AnimStudio.apk.idsig dist/AnimStudio.apk dist/AnimStudio.apk.idsig
npm run build

# 2. Prepare directories
mkdir -p /build-apk/src/com/animstudio/app \
         /build-apk/res/values \
         /build-apk/res/drawable \
         /build-apk/res/drawable-hdpi \
         /build-apk/res/drawable-xhdpi \
         /build-apk/res/drawable-xxhdpi \
         /build-apk/res/drawable-xxxhdpi \
         /build-apk/res/mipmap-mdpi \
         /build-apk/res/mipmap-hdpi \
         /build-apk/res/mipmap-xhdpi \
         /build-apk/res/mipmap-xxhdpi \
         /build-apk/res/mipmap-xxxhdpi \
         /build-apk/assets/www \
         /build-apk/gen \
         /build-apk/obj \
         /build-apk/bin

# 3. Copy compiled web app to assets
rm -rf /build-apk/assets/www/*
cp -r dist/* /build-apk/assets/www/
rm -f /build-apk/assets/www/*.apk /build-apk/assets/www/*.idsig
# Remove crossorigin attribute if present so module scripts never trigger origin=null CORS rejection
sed -i 's/ crossorigin//g' /build-apk/assets/www/index.html
sed -i 's/crossorigin=""//g' /build-apk/assets/www/index.html

# 4. Copy launcher icon (using high-res logo.png)
mkdir -p /build-apk/res/drawable \
         /build-apk/res/drawable-hdpi \
         /build-apk/res/drawable-xhdpi \
         /build-apk/res/drawable-xxhdpi \
         /build-apk/res/drawable-xxxhdpi \
         /build-apk/res/mipmap-mdpi \
         /build-apk/res/mipmap-hdpi \
         /build-apk/res/mipmap-xhdpi \
         /build-apk/res/mipmap-xxhdpi \
         /build-apk/res/mipmap-xxxhdpi

ffmpeg -y -i public/logo.png -vf scale=48:48 /build-apk/res/mipmap-mdpi/ic_launcher.png
ffmpeg -y -i public/logo.png -vf scale=72:72 /build-apk/res/mipmap-hdpi/ic_launcher.png
ffmpeg -y -i public/logo.png -vf scale=96:96 /build-apk/res/mipmap-xhdpi/ic_launcher.png
ffmpeg -y -i public/logo.png -vf scale=144:144 /build-apk/res/mipmap-xxhdpi/ic_launcher.png
ffmpeg -y -i public/logo.png -vf scale=192:192 /build-apk/res/mipmap-xxxhdpi/ic_launcher.png

cp /build-apk/res/mipmap-mdpi/ic_launcher.png /build-apk/res/mipmap-mdpi/ic_launcher_round.png
cp /build-apk/res/mipmap-hdpi/ic_launcher.png /build-apk/res/mipmap-hdpi/ic_launcher_round.png
cp /build-apk/res/mipmap-xhdpi/ic_launcher.png /build-apk/res/mipmap-xhdpi/ic_launcher_round.png
cp /build-apk/res/mipmap-xxhdpi/ic_launcher.png /build-apk/res/mipmap-xxhdpi/ic_launcher_round.png
cp /build-apk/res/mipmap-xxxhdpi/ic_launcher.png /build-apk/res/mipmap-xxxhdpi/ic_launcher_round.png

cp public/logo.png /build-apk/res/drawable/ic_launcher.png
ffmpeg -y -i public/logo.png -vf scale=144:144 /build-apk/res/drawable-hdpi/ic_launcher.png
ffmpeg -y -i public/logo.png -vf scale=192:192 /build-apk/res/drawable-xhdpi/ic_launcher.png
ffmpeg -y -i public/logo.png -vf scale=384:384 /build-apk/res/drawable-xxhdpi/ic_launcher.png
cp public/logo.png /build-apk/res/drawable-xxxhdpi/ic_launcher.png

# 5. Write colors.xml, styles.xml, and launch_screen.xml (Eliminating any cold-start black flash at 0ms)
cat << 'EOF' > /build-apk/res/values/colors.xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="launch_bg">#141414</color>
</resources>
EOF

cat << 'EOF' > /build-apk/res/drawable/launch_screen.xml
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/launch_bg" />
</layer-list>
EOF

cat << 'EOF' > /build-apk/res/values/styles.xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AnimStudioTheme" parent="@android:style/Theme.NoTitleBar">
        <item name="android:windowBackground">@color/launch_bg</item>
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowContentOverlay">@null</item>
        <item name="android:windowDisablePreview">true</item>
        <item name="android:windowIsTranslucent">false</item>
    </style>
</resources>
EOF

# 6. Write AndroidManifest.xml configured for High-Performance Native Hybrid Studio
cat << 'EOF' > /build-apk/AndroidManifest.xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.animstudio.app"
    android:versionCode="11"
    android:versionName="2.0.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="34" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:hardwareAccelerated="true"
        android:largeHeap="true"
        android:allowBackup="true">
        <activity
            android:name="com.animstudio.app.MainActivity"
            android:label="@string/app_name"
            android:icon="@mipmap/ic_launcher"
            android:theme="@style/AnimStudioTheme"
            android:screenOrientation="portrait"
            android:windowSoftInputMode="adjustResize"
            android:configChanges="orientation|screenSize|keyboardHidden|screenLayout"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

# 7. Write strings.xml
cat << 'EOF' > /build-apk/res/values/strings.xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Animstudio</string>
</resources>
EOF

# 8. Write MainActivity.java configured with zero-delay startup, hardware acceleration & native stealth
cat << 'EOF' > /build-apk/src/com/animstudio/app/MainActivity.java
package com.animstudio.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Message;
import android.os.Vibrator;
import android.util.Base64;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {

    private FrameLayout rootLayout;
    private WebView webView;
    private LinearLayout offlineLayout;
    private ValueCallback<Uri[]> filePathCallback;
    private static final int FILE_CHOOSER_REQUEST_CODE = 1001;
    private long lastBackPressTime = 0;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        setTheme(R.style.AnimStudioTheme);
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            getWindow().setStatusBarColor(0xFF141414);
            getWindow().setNavigationBarColor(0xFF141414);
        }
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);

        rootLayout = new FrameLayout(this);
        rootLayout.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        rootLayout.setBackgroundColor(0xFF141414);

        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        // Match native launch theme exactly to prevent any color flash
        webView.setBackgroundColor(0xFF141414);

        // Hardware-accelerated GPU direct rendering
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        // Native app feel: remove web scrollbars and boundary over-scroll glow
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);

        // Suppress web context menus, magnifiers and selection popups
        webView.setOnLongClickListener(new View.OnLongClickListener() {
            @Override
            public boolean onLongClick(View v) {
                return true;
            }
        });
        webView.setLongClickable(false);

        rootLayout.addView(webView);

        // Native Offline Layout
        setupOfflineLayout();
        rootLayout.addView(offlineLayout);

        setContentView(rootLayout);

        configureWebView();

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            loadLocalApp();
        }
    }

    private void setupOfflineLayout() {
        offlineLayout = new LinearLayout(this);
        offlineLayout.setLayoutParams(new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        offlineLayout.setOrientation(LinearLayout.VERTICAL);
        offlineLayout.setGravity(Gravity.CENTER);
        offlineLayout.setBackgroundColor(0xFF121212);
        offlineLayout.setPadding(48, 48, 48, 48);
        offlineLayout.setVisibility(View.GONE);

        TextView titleView = new TextView(this);
        titleView.setText("AnimStudio Offline");
        titleView.setTextColor(Color.WHITE);
        titleView.setTextSize(22);
        titleView.setGravity(Gravity.CENTER);
        titleView.setPadding(0, 0, 0, 16);

        TextView descView = new TextView(this);
        descView.setText("No internet connection detected. You can continue creating animations offline, or tap Retry to reconnect.");
        descView.setTextColor(0xFF9E9E9E);
        descView.setTextSize(14);
        descView.setGravity(Gravity.CENTER);
        descView.setPadding(0, 0, 0, 32);

        Button retryButton = new Button(this);
        retryButton.setText("RELOAD APP");
        retryButton.setTextColor(Color.BLACK);
        retryButton.setBackgroundColor(0xFFF59E0B);
        retryButton.setPadding(32, 16, 32, 16);
        retryButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                offlineLayout.setVisibility(View.GONE);
                loadLocalApp();
            }
        });

        offlineLayout.addView(titleView);
        offlineLayout.addView(descView);
        offlineLayout.addView(retryButton);
    }

    private void loadLocalApp() {
        webView.loadUrl("https://animstudio.local/index.html");
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(true);

        // Enable ultra-fast GPU hardware layer on WebView
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        // Mask user agent with native engine signature
        settings.setUserAgentString("AnimStudio Native Engine / v2.0.0 (Linux; U; Android " + Build.VERSION.RELEASE + "; " + Build.MODEL + ")");
        settings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.NORMAL);
        settings.setEnableSmoothTransition(true);

        // Disable web inspector / debug mode in release
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(false);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        }
        CookieManager.getInstance().setAcceptCookie(true);

        webView.addJavascriptInterface(new AndroidNativeBridge(), "AndroidBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUrlNavigation(url);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                if (url != null) {
                    return interceptLocalAsset(Uri.parse(url));
                }
                return null;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (request != null && request.getUrl() != null) {
                    return interceptLocalAsset(request.getUrl());
                }
                return null;
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                Log.e("AnimStudioWeb", "Error " + errorCode + ": " + description + " URL: " + failingUrl);
                if (failingUrl != null && !failingUrl.contains("animstudio.local")) {
                    offlineLayout.setVisibility(View.VISIBLE);
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                offlineLayout.setVisibility(View.GONE);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                if (consoleMessage != null) {
                    Log.d("AnimStudioJS", consoleMessage.message() + " [" + consoleMessage.sourceId() + ":" + consoleMessage.lineNumber() + "]");
                }
                return true;
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                WebView tempWebView = new WebView(MainActivity.this);
                tempWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, String targetUrl) {
                        return handleUrlNavigation(targetUrl);
                    }
                });
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(tempWebView);
                resultMsg.sendToTarget();
                return true;
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.setType("*/*");
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                try {
                    startActivityForResult(Intent.createChooser(intent, "Select File"), FILE_CHOOSER_REQUEST_CODE);
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
                return true;
            }
        });
    }

    private WebResourceResponse interceptLocalAsset(Uri uri) {
        if (uri == null) return null;
        String host = uri.getHost();
        String scheme = uri.getScheme();

        if ("animstudio.local".equalsIgnoreCase(host) || "localhost".equalsIgnoreCase(host) || "file".equalsIgnoreCase(scheme)) {
            String path = uri.getPath();
            if (path == null || path.isEmpty() || path.equals("/")) {
                path = "/index.html";
            }
            while (path.startsWith("/")) {
                path = path.substring(1);
            }
            if (path.startsWith("android_asset/www/")) {
                path = path.substring("android_asset/www/".length());
            } else if (path.startsWith("android_asset/")) {
                path = path.substring("android_asset/".length());
            }

            String assetPath = "www/" + path;
            try {
                InputStream is = getAssets().open(assetPath);
                String mimeType = getMimeType(assetPath);
                Map<String, String> headers = new HashMap<String, String>();
                headers.put("Access-Control-Allow-Origin", "*");
                headers.put("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
                headers.put("Access-Control-Allow-Headers", "*");
                return new WebResourceResponse(mimeType, "UTF-8", 200, "OK", headers, is);
            } catch (Exception e) {
                if (path.endsWith(".html") || !path.contains(".")) {
                    try {
                        InputStream is = getAssets().open("www/index.html");
                        Map<String, String> headers = new HashMap<String, String>();
                        headers.put("Access-Control-Allow-Origin", "*");
                        return new WebResourceResponse("text/html", "UTF-8", 200, "OK", headers, is);
                    } catch (Exception ex) {
                        return null;
                    }
                }
                return null;
            }
        }
        return null;
    }

    private String getMimeType(String path) {
        String lower = path.toLowerCase();
        if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".json") || lower.endsWith(".webmanifest")) return "application/json";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".ico")) return "image/x-icon";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".woff")) return "font/woff";
        if (lower.endsWith(".ttf")) return "font/ttf";
        if (lower.endsWith(".otf")) return "font/otf";
        if (lower.endsWith(".webm")) return "video/webm";
        if (lower.endsWith(".mp4")) return "video/mp4";
        return "application/octet-stream";
    }

    private boolean handleUrlNavigation(String url) {
        if (url != null && (url.startsWith("http://") || url.startsWith("https://"))) {
            if (url.contains("animstudio.local") || url.contains("localhost") || url.startsWith("file:///android_asset/")) {
                return false;
            }
            try {
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(browserIntent);
                return true;
            } catch (Exception e) {
                return false;
            }
        }
        return false;
    }

    // Native Bridge providing hardware vibration, sharing, toasts, and gallery export
    public class AndroidNativeBridge {

        @JavascriptInterface
        public boolean isNativeApp() {
            return true;
        }

        @JavascriptInterface
        public void vibrate(final long milliseconds) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                        if (vibrator != null && vibrator.hasVibrator()) {
                            vibrator.vibrate(Math.min(milliseconds > 0 ? milliseconds : 30, 250));
                        }
                    } catch (Exception ignored) {}
                }
            });
        }

        @JavascriptInterface
        public void showToast(final String message) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (message != null && message.length() > 0) {
                        Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }

        @JavascriptInterface
        public void shareText(final String title, final String text) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Intent shareIntent = new Intent(Intent.ACTION_SEND);
                        shareIntent.setType("text/plain");
                        if (title != null) shareIntent.putExtra(Intent.EXTRA_SUBJECT, title);
                        if (text != null) shareIntent.putExtra(Intent.EXTRA_TEXT, text);
                        startActivity(Intent.createChooser(shareIntent, title != null ? title : "Share with"));
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "Sharing failed: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }

        @JavascriptInterface
        public void openInBrowser(final String url) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        MainActivity.this.startActivity(browserIntent);
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "Opening in browser...", Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }

        @JavascriptInterface
        public void saveVideoToGallery(final String base64Data, final String mimeType, final String fileName) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        byte[] videoBytes = Base64.decode(base64Data, Base64.DEFAULT);
                        String cleanFileName = (fileName != null && fileName.length() > 0) ? fileName : ("AnimStudio_" + System.currentTimeMillis() + ".webm");

                        File moviesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES);
                        File animStudioDir = new File(moviesDir, "AnimStudio");
                        if (!animStudioDir.exists()) {
                            animStudioDir.mkdirs();
                        }
                        File file = new File(animStudioDir, cleanFileName);
                        FileOutputStream outputStream = new FileOutputStream(file);
                        outputStream.write(videoBytes);
                        outputStream.flush();
                        outputStream.close();

                        Intent mediaScanIntent = new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
                        Uri savedUri = Uri.fromFile(file);
                        mediaScanIntent.setData(savedUri);
                        sendBroadcast(mediaScanIntent);

                        Toast.makeText(MainActivity.this, "Exported directly to Gallery: " + cleanFileName, Toast.LENGTH_LONG).show();
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "Error saving: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (filePathCallback != null) {
                Uri[] results = null;
                if (resultCode == Activity.RESULT_OK && data != null) {
                    String dataString = data.getDataString();
                    if (dataString != null) {
                        results = new Uri[]{Uri.parse(dataString)};
                    }
                }
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            webView.onPause();
            webView.pauseTimers();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
            webView.resumeTimers();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    @Override
    protected void onRestoreInstanceState(Bundle savedInstanceState) {
        super.onRestoreInstanceState(savedInstanceState);
        if (webView != null) {
            webView.restoreState(savedInstanceState);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        // Double-tap back to exit prevents accidental loss of animation work
        long currentTime = System.currentTimeMillis();
        if (currentTime - lastBackPressTime < 2000) {
            super.onBackPressed();
        } else {
            lastBackPressTime = currentTime;
            Toast.makeText(this, "Press back again to exit AnimStudio", Toast.LENGTH_SHORT).show();
        }
    }
}
EOF

# 8. Generate R.java with AAPT
aapt package -f -m -J /build-apk/gen -M /build-apk/AndroidManifest.xml -S /build-apk/res -I /usr/lib/android-sdk/platforms/android-23/android.jar

# 9. Compile Java sources
javac -proc:none -source 1.8 -target 1.8 -d /build-apk/obj -cp /usr/lib/android-sdk/platforms/android-23/android.jar /build-apk/gen/com/animstudio/app/R.java /build-apk/src/com/animstudio/app/MainActivity.java

# 10. Convert bytecode to Dalvik DEX
/usr/bin/dalvik-exchange --dex --output=/build-apk/bin/classes.dex /build-apk/obj

# 11. Package APK resources and assets
aapt package -f -M /build-apk/AndroidManifest.xml -S /build-apk/res -A /build-apk/assets -I /usr/lib/android-sdk/platforms/android-23/android.jar -F /build-apk/bin/AnimStudio.unsigned.apk

# 12. Add classes.dex
(cd /build-apk/bin && aapt add AnimStudio.unsigned.apk classes.dex)

# 13. Zipalign APK
zipalign -f -p 4 /build-apk/bin/AnimStudio.unsigned.apk /build-apk/bin/AnimStudio.aligned.apk

# 14. Sign with release keystore
if [ ! -f /build-apk/release.keystore ]; then
  keytool -genkey -v -keystore /build-apk/release.keystore -alias animstudio -keyalg RSA -keysize 2048 -validity 10000 -storepass animstudio123 -keypass animstudio123 -dname "CN=AnimStudio, OU=Animation, O=AnimStudio, L=SanFrancisco, ST=CA, C=US"
fi

apksigner sign --ks /build-apk/release.keystore --ks-pass pass:animstudio123 --key-pass pass:animstudio123 --out ./public/AnimStudio.apk /build-apk/bin/AnimStudio.aligned.apk
cp ./public/AnimStudio.apk ./dist/AnimStudio.apk

apksigner verify -v ./public/AnimStudio.apk

echo "=== APK Successfully Built & Signed (Strict Portrait Mode): public/AnimStudio.apk ==="
