package com.example.rapidresponse.screens.incoming

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.example.rapidresponse.model.EmergencyAlert
import com.example.rapidresponse.ui.components.ScreenHeader
import com.example.rapidresponse.ui.theme.Red

// Campus-wide feed of everything reported in the last 24h - what security/admin land on when
// they tap a push notification. Restricted server-side to security/admin (GET
// /api/alerts/recent), so a non-staff user landing here would just see an error, not data.
@Composable
fun IncomingAlertsScreen(navController: NavController, viewModel: IncomingAlertsViewModel = hiltViewModel()) {
    val alerts by viewModel.alerts.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val error by viewModel.error.collectAsState()

    Column(modifier = Modifier.fillMaxSize().padding(20.dp)) {
        ScreenHeader(title = "Incoming Alerts", onBack = { navController.popBackStack() })
        Text(
            "Everything reported campus-wide in the last 24 hours.",
            fontSize = 13.sp,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Red)
            }
            error != null -> Text(error ?: "Something went wrong", color = MaterialTheme.colorScheme.error)
            alerts.isEmpty() -> Text("No alerts reported in the last 24 hours.")
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(alerts) { alert -> IncomingAlertRow(alert) }
            }
        }
    }
}

@Composable
private fun IncomingAlertRow(alert: EmergencyAlert) {
    val priorityColor = when (alert.priority) {
        "high" -> Red
        "medium" -> Color(0xFFF9A825)
        else -> Color(0xFF2E7D32)
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
                (alert.priority).replaceFirstChar { it.uppercase() },
                color = priorityColor,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium
            )
        }
        Text(alert.description, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
        if (!alert.building.isNullOrBlank()) {
            Text("Building: ${alert.building}${alert.floor?.let { " · Floor $it" } ?: ""}", fontSize = 12.sp)
        }
        alert.reporterName?.let {
            Text("Reported by $it", fontSize = 12.sp, color = Color.Gray, modifier = Modifier.padding(top = 4.dp))
        }
        alert.createdAt?.let {
            Text(it, fontSize = 11.sp, color = Color.Gray)
        }
    }
}
