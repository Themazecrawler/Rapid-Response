package com.example.rapidresponse.screens.home

import android.Manifest
import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.example.rapidresponse.auth.AuthViewModel
import com.example.rapidresponse.data.navigationDrawerItems
import com.example.rapidresponse.data.staffNavigationDrawerItems
import com.example.rapidresponse.navigation.Screen
import com.example.rapidresponse.ui.theme.Red
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class, ExperimentalPermissionsApi::class)
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
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    val drawerItems = remember(role) {
        if (role == "security" || role == "admin") {
            navigationDrawerItems + staffNavigationDrawerItems
        } else {
            navigationDrawerItems
        }
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        val notificationPermission = rememberPermissionState(Manifest.permission.POST_NOTIFICATIONS)
        LaunchedEffect(Unit) {
            if (!notificationPermission.status.isGranted) {
                notificationPermission.launchPermissionRequest()
            }
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        scrimColor = Color.Black.copy(alpha = 0.5f),
        drawerContent = {
            ModalDrawerSheet(
                modifier = Modifier.width(270.dp),
                drawerShape = RectangleShape,
                drawerContainerColor = Red
            ) {
                Spacer(Modifier.height(40.dp))
                Text(
                    "Rapid Response",
                    color = Color.White,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp)
                )
                Divider(color = Color.White.copy(alpha = 0.2f), modifier = Modifier.padding(vertical = 10.dp))
                Column(
                    verticalArrangement = Arrangement.spacedBy(30.dp),
                    modifier = Modifier.padding(horizontal = 20.dp)
                ) {
                    drawerItems.forEach { item ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    scope.launch { drawerState.close() }
                                    navController.navigate(item.route)
                                },
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                item.icon,
                                contentDescription = item.name,
                                tint = Color.White,
                                modifier = Modifier.size(28.dp).padding(end = 12.dp)
                            )
                            Text(item.name, color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Medium)
                        }
                    }
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                scope.launch { drawerState.close() }
                                authViewModel.signOut()
                            },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Filled.Logout,
                            contentDescription = "Sign out",
                            tint = Color.White,
                            modifier = Modifier.size(28.dp).padding(end = 12.dp)
                        )
                        Text("Sign Out", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Medium)
                    }
                }
            }
        }
    ) {
        Scaffold(
            topBar = {
                SmallTopAppBar(
                    title = { Text("Rapid Response") },
                    navigationIcon = {
                        IconButton(onClick = { scope.launch { drawerState.open() } }) {
                            Icon(Icons.Filled.Menu, contentDescription = "Menu")
                        }
                    },
                    colors = TopAppBarDefaults.smallTopAppBarColors(
                        containerColor = Color.White
                    )
                )
            }
        ) { padding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(20.dp)
            ) {
                Text(
                    "Welcome back, ${user?.displayName ?: "User"}!",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    "Emergency Alert System",
                    fontSize = 14.sp,
                    color = Color.Gray,
                    modifier = Modifier.padding(bottom = 30.dp)
                )

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(Red)
                        .clickable { navController.navigate(Screen.AlertScreen.route) }
                        .padding(vertical = 24.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Filled.Warning, contentDescription = null, tint = Color.White)
                    Spacer(Modifier.width(10.dp))
                    Text(
                        "EMERGENCY ALERT",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                if (pendingCount > 0) {
                    Spacer(Modifier.height(12.dp))
                    val bannerColor = if (hasFailed) MaterialTheme.colorScheme.error else Color(0xFFF9A825)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(bannerColor.copy(alpha = 0.1f))
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
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = bannerColor
                        )
                    }
                }

                Spacer(Modifier.height(30.dp))

                Text("Quick Actions", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(12.dp))

                drawerItems.forEach { item ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFFF5F5F5))
                            .clickable { navController.navigate(item.route) }
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(item.icon, contentDescription = item.name, tint = Red)
                        Spacer(Modifier.width(14.dp))
                        Text(item.name, fontSize = 15.sp, fontWeight = FontWeight.Medium)
                    }
                    Spacer(Modifier.height(10.dp))
                }
            }
        }
    }
}
