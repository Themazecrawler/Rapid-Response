package com.example.rapidresponse.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.rapidresponse.auth.AuthViewModel
import com.example.rapidresponse.notifications.NotificationNavigator
import com.example.rapidresponse.screens.alert.AlertScreen
import com.example.rapidresponse.screens.auth.LoginScreen
import com.example.rapidresponse.screens.auth.RegisterScreen
import com.example.rapidresponse.screens.contacts.ContactsScreen
import com.example.rapidresponse.screens.history.HistoryScreen
import com.example.rapidresponse.screens.home.HomeScreen
import com.example.rapidresponse.screens.incoming.IncomingAlertsScreen
import com.example.rapidresponse.screens.location.LocationScreen
import com.example.rapidresponse.screens.statistics.StatisticsScreen

@Composable
fun RapidResponseNavigation() {
    val navController = rememberNavController()
    val authViewModel: AuthViewModel = hiltViewModel()
    val user by authViewModel.user.collectAsState()
    val pendingRoute by NotificationNavigator.pendingRoute.collectAsState()

    val startDestination = if (user != null) Screen.HomeScreen.route else Screen.LoginScreen.route

    // A tapped push notification (cold start or warm) sets this; once we're signed in and the
    // graph is composed, follow it and clear it so it doesn't re-fire on config change.
    LaunchedEffect(pendingRoute, user) {
        if (pendingRoute != null && user != null) {
            navController.navigate(pendingRoute!!)
            NotificationNavigator.consume()
        }
    }

    NavHost(navController = navController, startDestination = startDestination) {
        composable(Screen.LoginScreen.route) { LoginScreen(navController) }
        composable(Screen.RegisterScreen.route) { RegisterScreen(navController) }
        composable(Screen.HomeScreen.route) { HomeScreen(navController) }
        composable(Screen.AlertScreen.route) { AlertScreen(navController) }
        composable(Screen.ContactsScreen.route) { ContactsScreen(navController) }
        composable(Screen.LocationScreen.route) { LocationScreen(navController) }
        composable(Screen.HistoryScreen.route) { HistoryScreen(navController) }
        composable(Screen.StatisticsScreen.route) { StatisticsScreen(navController) }
        composable(Screen.IncomingAlertsScreen.route) { IncomingAlertsScreen(navController) }
    }
}
