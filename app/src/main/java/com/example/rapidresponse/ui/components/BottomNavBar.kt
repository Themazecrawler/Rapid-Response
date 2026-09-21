package com.example.rapidresponse.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContactPhone
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.example.rapidresponse.navigation.Screen

enum class BottomDestination(val route: String, val icon: ImageVector, val label: String) {
    Home(Screen.HomeScreen.route, Icons.Filled.Home, "Home"),
    Contacts(Screen.ContactsScreen.route, Icons.Filled.ContactPhone, "Contacts"),
    Location(Screen.LocationScreen.route, Icons.Filled.LocationOn, "Map"),
    History(Screen.HistoryScreen.route, Icons.Filled.History, "History")
}

// A floating pill bar with a raised center SOS button, in place of the old side drawer for the
// four peer destinations. Each hosting screen navigates by route, so the nav graph is unchanged.
@Composable
fun BottomNavBar(
    current: BottomDestination,
    onNavigate: (String) -> Unit,
    onSos: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(modifier = modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 20.dp, vertical = 12.dp)) {
        Surface(
            shape = MaterialTheme.shapes.extraLarge,
            color = MaterialTheme.colorScheme.surface,
            shadowElevation = 8.dp,
            modifier = Modifier.fillMaxWidth().height(68.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                NavIcon(BottomDestination.Home, current, onNavigate)
                NavIcon(BottomDestination.Contacts, current, onNavigate)
                Box(modifier = Modifier.size(56.dp))
                NavIcon(BottomDestination.Location, current, onNavigate)
                NavIcon(BottomDestination.History, current, onNavigate)
            }
        }
        Surface(
            shape = CircleShape,
            color = MaterialTheme.colorScheme.primary,
            shadowElevation = 6.dp,
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 2.dp)
                .size(56.dp)
                .shadow(6.dp, CircleShape)
                .clickable(onClick = onSos)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    Icons.Filled.Warning,
                    contentDescription = "Emergency alert",
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(26.dp)
                )
            }
        }
    }
}

@Composable
private fun RowScope.NavIcon(
    destination: BottomDestination,
    current: BottomDestination,
    onNavigate: (String) -> Unit
) {
    val selected = destination == current
    val tint = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .weight(1f)
            .clickable(enabled = !selected) { onNavigate(destination.route) },
        contentAlignment = Alignment.Center
    ) {
        Icon(destination.icon, contentDescription = destination.label, tint = tint, modifier = Modifier.size(24.dp))
    }
}
