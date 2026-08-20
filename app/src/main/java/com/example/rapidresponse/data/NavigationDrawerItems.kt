package com.example.rapidresponse.data

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContactPhone
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.LocationOn
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
    NavigationDrawerItem("Alert History", Icons.Filled.History, Screen.HistoryScreen.route)
)
