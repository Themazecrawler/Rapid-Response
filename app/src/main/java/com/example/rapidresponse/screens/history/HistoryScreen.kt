package com.example.rapidresponse.screens.history

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.example.rapidresponse.local.PendingAlertEntity
import com.example.rapidresponse.local.PendingAlertStatus
import com.example.rapidresponse.model.EmergencyAlert
import com.example.rapidresponse.ui.theme.Red

@Composable
fun HistoryScreen(navController: NavController, viewModel: HistoryViewModel = hiltViewModel()) {
    val alerts by viewModel.alerts.collectAsState()
    val pendingAlerts by viewModel.pendingAlerts.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val error by viewModel.error.collectAsState()

    Column(modifier = Modifier.fillMaxSize().padding(20.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 10.dp)) {
            IconButton(onClick = { navController.popBackStack() }) {
                Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
            }
            Text("Alert History", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        }

        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Red)
            }
            error != null && pendingAlerts.isEmpty() -> Text(
                error ?: "Something went wrong",
                color = MaterialTheme.colorScheme.error
            )
            alerts.isEmpty() && pendingAlerts.isEmpty() -> Text("No alerts reported yet.")
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

@Composable
private fun PendingAlertRow(
    pending: PendingAlertEntity,
    onRetry: () -> Unit,
    onDiscard: () -> Unit
) {
    val failed = pending.status == PendingAlertStatus.FAILED
    val accent = if (failed) MaterialTheme.colorScheme.error else Color(0xFFF9A825)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(accent.copy(alpha = 0.08f))
            .padding(14.dp)
    ) {
        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            Text(pending.type, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    if (failed) Icons.Filled.ErrorOutline else Icons.Filled.Schedule,
                    contentDescription = null,
                    tint = accent,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(Modifier.width(4.dp))
                Text(
                    if (failed) "Not delivered" else "Delivering...",
                    color = accent,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
        Text(pending.description, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
        if (!pending.building.isNullOrBlank()) {
            Text("Building: ${pending.building}${pending.floor?.let { " · Floor $it" } ?: ""}", fontSize = 12.sp)
        }
        if (failed) {
            Text(
                "Saved on this device, but campus security hasn't received it yet" +
                    (pending.lastError?.let { " ($it)" } ?: "."),
                fontSize = 11.sp,
                color = Color.Gray,
                modifier = Modifier.padding(top = 4.dp)
            )
            Row(modifier = Modifier.padding(top = 8.dp)) {
                TextButton(onClick = onRetry) { Text("Retry now", color = Red) }
                TextButton(onClick = onDiscard) { Text("Discard", color = Color.Gray) }
            }
        } else {
            Text(
                "Saved on this device and being delivered automatically.",
                fontSize = 11.sp,
                color = Color.Gray,
                modifier = Modifier.padding(top = 4.dp)
            )
        }
    }
}

@Composable
private fun AlertRow(alert: EmergencyAlert) {
    val statusColor = when (alert.status) {
        "resolved" -> Color(0xFF2E7D32)
        "investigating" -> Color(0xFFF9A825)
        else -> Red
    }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFFF5F5F5))
            .padding(14.dp)
    ) {
        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            Text(alert.type, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
            Text(
                (alert.status ?: "active").replaceFirstChar { it.uppercase() },
                color = statusColor,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium
            )
        }
        Text(alert.description, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
        if (!alert.building.isNullOrBlank()) {
            Text("Building: ${alert.building}${alert.floor?.let { " · Floor $it" } ?: ""}", fontSize = 12.sp)
        }
        alert.createdAt?.let {
            Text(it, fontSize = 11.sp, color = Color.Gray, modifier = Modifier.padding(top = 4.dp))
        }
    }
}
