package com.animstudio.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.ContentValues
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private val FILE_CHOOSER_REQUEST_CODE = 1001
    private val STORAGE_PERMISSION_CODE = 1002

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Lock to landscape or responsive orientation
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_USER_LANDSCAPE

        // Immersive sticky full screen
        hideSystemUI()

        webView = WebView(this)
        webView.setBackgroundColor(0xFF0F0F10.toInt())
        webView.isVerticalScrollBarEnabled = false
        webView.isHorizontalScrollBarEnabled = false
        webView.overScrollMode = View.OVER_SCROLL_NEVER
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)
        setContentView(webView)

        configureWebView()

        // Check and request storage permissions if needed for older Android
        checkStoragePermissions()

        // Load local bundled web assets or production dev server
        val localIndex = "file:///android_asset/dist/index.html"
        val serverUrl = "https://ai.studio/build" // Or local IP / production hosted url
        
        // Load asset if present, otherwise load server
        val assetExists = try {
            assets.open("dist/index.html").close()
            true
        } catch (e: Exception) {
            false
        }

        if (assetExists) {
            webView.loadUrl(localIndex)
        } else {
            webView.loadUrl("http://localhost:3000/")
        }
    }

    private fun configureWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }

        // Add JavaScript Bridge for Gallery Export
        webView.addJavascriptInterface(AndroidGalleryBridge(), "AndroidBridge")

        // Intercept external links and ad clicks to open in real browser
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                return handleUrlNavigation(url)
            }

            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                if (url == null) return false
                return handleUrlNavigation(url)
            }
        }

        // Handle file uploads (PNG import, JSON project import)
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "*/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE)
                } catch (e: Exception) {
                    this@MainActivity.filePathCallback = null
                    return false
                }
                return true
            }
        }
    }

    /**
     * Intercepts ad clicks, sponsors, and external links to redirect directly to user's browser
     */
    private fun handleUrlNavigation(url: String): Boolean {
        if (url.startsWith("http://") || url.startsWith("https://")) {
            // Keep local applet domain inside webview, open all external ad/sponsor links in external browser
            if (url.contains("localhost") || url.contains("127.0.0.1") || url.startsWith("file:///android_asset/")) {
                return false // Stay in WebView
            }
            try {
                val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                startActivity(browserIntent)
                return true // Redirected to real browser
            } catch (e: Exception) {
                Toast.makeText(this, "Opening in browser...", Toast.LENGTH_SHORT).show()
            }
        }
        return false
    }

    /**
     * Javascript Interface exposed to Web code as window.AndroidBridge
     */
    inner class AndroidGalleryBridge {
        @JavascriptInterface
        fun saveVideoToGallery(base64Data: String, mimeType: String, fileName: String) {
            runOnUiThread {
                try {
                    val videoBytes = Base64.decode(base64Data, Base64.DEFAULT)
                    val cleanFileName = if (fileName.isNotBlank()) fileName else "AnimStudio_${System.currentTimeMillis()}.webm"

                    var outputStream: OutputStream? = null
                    var savedUri: Uri? = null

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        val contentValues = ContentValues().apply {
                            put(MediaStore.MediaColumns.DISPLAY_NAME, cleanFileName)
                            put(MediaStore.MediaColumns.MIME_TYPE, if (mimeType.isNotBlank()) mimeType else "video/webm")
                            put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/AnimStudio")
                            put(MediaStore.Video.Media.IS_PENDING, 1)
                        }

                        val resolver = contentResolver
                        savedUri = resolver.insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, contentValues)
                        if (savedUri != null) {
                            outputStream = resolver.openOutputStream(savedUri)
                            outputStream?.write(videoBytes)
                            outputStream?.flush()
                            outputStream?.close()

                            contentValues.clear()
                            contentValues.put(MediaStore.Video.Media.IS_PENDING, 0)
                            resolver.update(savedUri, contentValues, null, null)
                        }
                    } else {
                        val moviesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES)
                        val animStudioDir = File(moviesDir, "AnimStudio")
                        if (!animStudioDir.exists()) {
                            animStudioDir.mkdirs()
                        }
                        val file = File(animStudioDir, cleanFileName)
                        outputStream = FileOutputStream(file)
                        outputStream.write(videoBytes)
                        outputStream.flush()
                        outputStream.close()

                        // Trigger media scanner so it appears instantly in gallery
                        val mediaScanIntent = Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE)
                        savedUri = Uri.fromFile(file)
                        mediaScanIntent.data = savedUri
                        sendBroadcast(mediaScanIntent)
                    }

                    Toast.makeText(
                        this@MainActivity,
                        "Video exported directly to Gallery / Photos: $cleanFileName",
                        Toast.LENGTH_LONG
                    ).show()

                } catch (e: Exception) {
                    Toast.makeText(
                        this@MainActivity,
                        "Error saving to gallery: ${e.localizedMessage}",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }
        }
    }

    private fun hideSystemUI() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                controller.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_FULLSCREEN
            )
        }
    }

    private fun checkStoragePermissions() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE)
                != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE, Manifest.permission.READ_EXTERNAL_STORAGE),
                    STORAGE_PERMISSION_CODE
                )
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            val results: Array<Uri>? = if (resultCode == RESULT_OK && data != null) {
                data.data?.let { arrayOf(it) } ?: data.clipData?.let { clip ->
                    Array(clip.itemCount) { i -> clip.getItemAt(i).uri }
                }
            } else null
            filePathCallback?.onReceiveValue(results)
            filePathCallback = null
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
