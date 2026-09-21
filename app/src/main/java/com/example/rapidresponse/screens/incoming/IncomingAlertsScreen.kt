package com.example.rapidresponse.screens.incoming

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.NavController
import com.example.rapidresponse.model.EmergencyAlert
import com.example.rapidresponse.ui.components.EmptyState
import com.example.rapidresponse.ui.components.ScreenHeader
import com.example.rapidresponse.ui.components.StatusPill
import com.example.rapidresponse.ui.theme.Moss
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private const val POLL_INTERVAL_MS = 60_000L

// Campus-wide feed of everything reported in the last 24h - what security/admin land on when
// they tap a push notification. Restricted server-side to security/admin (GET
// /api/alerts/recent), so a non-staff user landing here would just see an error, not data.
@Composable
fun IncomingAlertsScreen(navController: NavController, viewModel: IncomingAlertsViewModel = hiltViewModel()) {
    val alerts by viewModel.alerts.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val error by viewModel.error.collectAsState()

    val lifecycleOwner = LocalLifecycleOwner.current
    LaunchedEffect(lifecycleOwner) {
        lifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
            launch { viewModel.streamEvents().collect { viewModel.refresh() } }
            while (true) {
                delay(POLL_INTERVAL_MS)
                viewModel.refresh()
            }
        }
    }

    Column(modifier = Modifier.fillMaxSize().padding(20.dp)) {
        ScreenHeader(title = "Incoming Alerts", onBack = { navController.popBackStack() })
        Text(
            "Everything reported campus-wide in the last 24 hours.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
            error != null -> Text(error ?: "Something went wrong", color = MaterialTheme.colorScheme.error)
            alerts.isEmpty() -> EmptyState("No alerts reported in the last 24 hours.")
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(alerts) { alert -> IncomingAlertRow(alert) }
            }
        }
    }
}

@Composable
private fun IncomingAlertRow(alert: EmergencyAlert) {
    val priorityColor = when (alert.priority) {
        "high" -> MaterialTheme.colorScheme.primary
        "medium" -> MaterialTheme.colorScheme.secondary
        else -> Moss
    }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceVariant, MaterialTheme.shapes.medium)
            .padding(14.dp)
    ) {
        Row(
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(alert.type, style = MaterialTheme.typography.titleSmall)
            StatusPill(alert.priority.replaceFirstChar { it.uppercase() }, priorityColor)
        }
        Text(alert.description, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
        if (!alert.building.isNullOrBlank()) {
            Text(
                "Building: ${alert.building}${alert.floor?.let { " · Floor $it" } ?: ""}",
                style = MaterialTheme.typography.bodySmall
            )
        }
        alert.reporterName?.let {
            Text(
                "Reported by $it",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp)
            )
        }
        alert.createdAt?.let {
            Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
