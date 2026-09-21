package com.example.rapidresponse.screens.history

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.example.rapidresponse.local.PendingAlertEntity
import com.example.rapidresponse.local.PendingAlertStatus
import com.example.rapidresponse.model.EmergencyAlert
import com.example.rapidresponse.navigation.Screen
import com.example.rapidresponse.ui.components.BottomDestination
import com.example.rapidresponse.ui.components.BottomNavBar
import com.example.rapidresponse.ui.components.EmptyState
import com.example.rapidresponse.ui.components.ScreenHeader
import com.example.rapidresponse.ui.components.StatusPill
import com.example.rapidresponse.ui.theme.Moss

@Composable
fun HistoryScreen(navController: NavController, viewModel: HistoryViewModel = hiltViewModel()) {
    val alerts by viewModel.alerts.collectAsState()
    val pendingAlerts by viewModel.pendingAlerts.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val error by viewModel.error.collectAsState()

    Scaffold(
        bottomBar = {
            BottomNavBar(
                current = BottomDestination.History,
                onNavigate = { navController.navigate(it) },
                onSos = { navController.navigate(Screen.AlertScreen.route) }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(20.dp)) {
            ScreenHeader(title = "Alert History", onBack = { navController.popBackStack() })

            when {
                loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
                error != null && pendingAlerts.isEmpty() -> Text(
                    error ?: "Something went wrong",
                    color = MaterialTheme.colorScheme.error
                )
                alerts.isEmpty() && pendingAlerts.isEmpty() -> EmptyState("No alerts reported yet.")
                else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(pendingAlerts, key = { it.clientAlertId }) { pending ->
                        PendingAlertRow(
                            pending = pending,
                            onRetry = { viewModel.retry(pending.clientAlertId) },
                            onDiscard = { viewModel.discard(pending.clientAlertId) }
                        )
                    }
                    items(alerts) { alert -> AlertRow(alert) }
                }
            }
        }
    }
}

@Composable
private fun PendingAlertRow(
    pending: PendingAlertEntity,
    onRetry: () -> Unit,
    onDiscard: () -> Unit
) {
    val failed = pending.status == PendingAlertStatus.FAILED
    val accent = if (failed) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.secondary

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(accent.copy(alpha = 0.08f), MaterialTheme.shapes.medium)
            .padding(14.dp)
    ) {
        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            Text(pending.type, style = MaterialTheme.typography.titleSmall)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    if (failed) Icons.Filled.ErrorOutline else Icons.Filled.Schedule,
                    contentDescription = null,
                    tint = accent,
                    modifier = Modifier.width(16.dp)
                )
                Spacer(Modifier.width(4.dp))
                Text(
                    if (failed) "Not delivered" else "Delivering...",
                    style = MaterialTheme.typography.bodySmall,
                    color = accent
                )
            }
        }
        Text(
            pending.description,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.padding(top = 4.dp)
        )
        if (!pending.building.isNullOrBlank()) {
            Text(
                "Building: ${pending.building}${pending.floor?.let { " · Floor $it" } ?: ""}",
                style = MaterialTheme.typography.bodySmall
            )
        }
        if (failed) {
            Text(
                "Saved on this device, but campus security hasn't received it yet" +
                    (pending.lastError?.let { " ($it)" } ?: "."),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp)
            )
            Row(modifier = Modifier.padding(top = 8.dp)) {
                TextButton(onClick = onRetry) { Text("Retry now", color = MaterialTheme.colorScheme.primary) }
                TextButton(onClick = onDiscard) {
                    Text("Discard", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        } else {
            Text(
                "Saved on this device and being delivered automatically.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp)
            )
        }
    }
}

@Composable
private fun AlertRow(alert: EmergencyAlert) {
    val statusColor = when (alert.status) {
        "resolved" -> Moss
        "investigating" -> MaterialTheme.colorScheme.secondary
        else -> MaterialTheme.colorScheme.primary
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
            StatusPill((alert.status ?: "active").replaceFirstChar { it.uppercase() }, statusColor)
        }
        Text(alert.description, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
        if (!alert.building.isNullOrBlank()) {
            Text(
                "Building: ${alert.building}${alert.floor?.let { " · Floor $it" } ?: ""}",
                style = MaterialTheme.typography.bodySmall
            )
        }
        alert.createdAt?.let {
            Text(
                it,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp)
            )
        }
    }
}
