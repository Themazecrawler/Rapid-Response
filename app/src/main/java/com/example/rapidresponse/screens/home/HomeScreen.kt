package com.example.rapidresponse.screens.home

import android.Manifest
import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.example.rapidresponse.auth.AuthViewModel
import com.example.rapidresponse.data.navigationDrawerItems
import com.example.rapidresponse.data.staffNavigationDrawerItems
import com.example.rapidresponse.navigation.Screen
import com.example.rapidresponse.ui.components.BottomDestination
import com.example.rapidresponse.ui.components.BottomNavBar
import com.example.rapidresponse.ui.components.ListRow
import com.example.rapidresponse.ui.components.SectionLabel
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun HomeScreen(
    navController: NavController,
    authViewModel: AuthViewModel = hiltViewModel(),
    homeViewModel: HomeViewModel = hiltViewModel()
) {
    val user by authViewModel.user.collectAsState()
    val role by authViewModel.role.collectAsState()
    val pendingCount by homeViewModel.pendingCount.collectAsState()
    val hasFailed by homeViewModel.hasFailed.collectAsState()

    val quickActions = remember(role) {
        val items = navigationDrawerItems.filterNot {
            it.route in setOf(Screen.ContactsScreen.route, Screen.LocationScreen.route, Screen.HistoryScreen.route, Screen.AlertScreen.route)
        }
        if (role == "security" || role == "admin") items + staffNavigationDrawerItems else items
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        val notificationPermission = rememberPermissionState(Manifest.permission.POST_NOTIFICATIONS)
        LaunchedEffect(Unit) {
            if (!notificationPermission.status.isGranted) {
                notificationPermission.launchPermissionRequest()
            }
        }
    }

    Scaffold(
        bottomBar = {
            BottomNavBar(
                current = BottomDestination.Home,
                onNavigate = { navController.navigate(it) },
                onSos = { navController.navigate(Screen.AlertScreen.route) }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(20.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        "Welcome back,",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        user?.displayName ?: "User",
                        style = MaterialTheme.typography.headlineLarge
                    )
                }
                IconButton(onClick = { authViewModel.signOut() }) {
                    Icon(
                        Icons.Filled.Logout,
                        contentDescription = "Sign out",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(Modifier.height(28.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.primary, MaterialTheme.shapes.large)
                    .clickable { navController.navigate(Screen.AlertScreen.route) }
                    .padding(horizontal = 20.dp, vertical = 22.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .height(52.dp)
                        .background(MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.16f), MaterialTheme.shapes.medium)
                        .padding(14.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Filled.Warning, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimary)
                }
                Spacer(Modifier.width(16.dp))
                Column {
                    Text(
                        "EMERGENCY",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f)
                    )
                    Text(
                        "Tap for help",
                        style = MaterialTheme.typography.displaySmall,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                }
            }

            if (pendingCount > 0) {
                Spacer(Modifier.height(12.dp))
                val bannerColor = if (hasFailed) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.secondary
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(bannerColor.copy(alpha = 0.1f), MaterialTheme.shapes.medium)
                        .clickable { navController.navigate(Screen.HistoryScreen.route) }
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        if (hasFailed) Icons.Filled.ErrorOutline else Icons.Filled.Schedule,
                        contentDescription = null,
                        tint = bannerColor
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(
                        if (hasFailed) {
                            "$pendingCount alert${if (pendingCount > 1) "s" else ""} not yet delivered - tap to view"
                        } else {
                            "$pendingCount alert${if (pendingCount > 1) "s" else ""} delivering in the background"
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = bannerColor
                    )
                }
            }

            if (quickActions.isNotEmpty()) {
                Spacer(Modifier.height(32.dp))
                SectionLabel("Quick actions")
                Spacer(Modifier.height(12.dp))
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    quickActions.forEach { item ->
                        ListRow(
                            icon = item.icon,
                            title = item.name,
                            onClick = { navController.navigate(item.route) }
                        )
                    }
                }
            }
        }
    }
}
