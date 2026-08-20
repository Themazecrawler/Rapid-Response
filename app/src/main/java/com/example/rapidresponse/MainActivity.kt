package com.example.rapidresponse

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.example.rapidresponse.navigation.RapidResponseNavigation
import com.example.rapidresponse.notifications.NotificationNavigator
import com.example.rapidresponse.ui.theme.RapidResponseTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    companion object {
        const val EXTRA_NAVIGATE_TO = "navigate_to"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        consumeNavigationExtra(intent)
        setContent {
            RapidResponseTheme {
                RapidResponseApp()
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        consumeNavigationExtra(intent)
    }

    // Set when the activity is launched (or re-launched) from a tapped push notification -
    // see RapidResponseFirebaseMessagingService. The NavHost picks this up once composed.
    private fun consumeNavigationExtra(intent: Intent) {
        intent.getStringExtra(EXTRA_NAVIGATE_TO)?.let { route ->
            NotificationNavigator.navigateTo(route)
        }
    }
}

@Composable
fun RapidResponseApp() {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        RapidResponseNavigation()
    }
}
