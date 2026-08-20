package com.example.rapidresponse.data

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.ContactPhone
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Warning
import androidx.compose.ui.graphics.vector.ImageVector
import com.example.rapidresponse.navigation.Screen

data class NavigationDrawerItem(
    val name: String,
    val icon: ImageVector,
    val route: String
)

val navigationDrawerItems = listOf(
    NavigationDrawerItem("Emergency Alert", Icons.Filled.Warning, Screen.AlertScreen.route),
    NavigationDrawerItem("Emergency Contacts", Icons.Filled.ContactPhone, Screen.ContactsScreen.route),
    NavigationDrawerItem("My Location", Icons.Filled.LocationOn, Screen.LocationScreen.route),
    NavigationDrawerItem("Alert History", Icons.Filled.History, Screen.HistoryScreen.route),
    NavigationDrawerItem("Alert Statistics", Icons.Filled.BarChart, Screen.StatisticsScreen.route)
)

// Only security/admin get push notifications about new alerts, so this is the only item
// gated by role - everything else in navigationDrawerItems is available to any signed-in user.
val staffNavigationDrawerItems = listOf(
    NavigationDrawerItem("Incoming Alerts", Icons.Filled.NotificationsActive, Screen.IncomingAlertsScreen.route)
)
