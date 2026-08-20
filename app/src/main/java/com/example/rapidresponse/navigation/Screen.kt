package com.example.rapidresponse.navigation

sealed class Screen(val route: String) {
    object LoginScreen : Screen("login_screen")
    object RegisterScreen : Screen("register_screen")
    object HomeScreen : Screen("home_screen")
    object AlertScreen : Screen("alert_screen")
    object ContactsScreen : Screen("contacts_screen")
    object LocationScreen : Screen("location_screen")
    object HistoryScreen : Screen("history_screen")
    object StatisticsScreen : Screen("statistics_screen")
}
