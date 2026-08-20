package com.example.rapidresponse.screens.location

import android.Manifest
import android.content.Intent
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.tasks.CancellationTokenSource
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
import com.google.maps.android.compose.rememberCameraPositionState
import com.example.rapidresponse.ui.theme.Red

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun LocationScreen(navController: NavController) {
    val context = LocalContext.current
    val permissionState = rememberPermissionState(Manifest.permission.ACCESS_FINE_LOCATION)
    var location by remember { mutableStateOf<LatLng?>(null) }

    LaunchedEffect(permissionState.status.isGranted) {
        if (!permissionState.status.isGranted) {
            permissionState.launchPermissionRequest()
            return@LaunchedEffect
        }
        val client = LocationServices.getFusedLocationProviderClient(context)
        client.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, CancellationTokenSource().token)
            .addOnSuccessListener { loc ->
                if (loc != null) location = LatLng(loc.latitude, loc.longitude)
            }
    }

    Column(modifier = Modifier.fillMaxSize().padding(20.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 10.dp)) {
            IconButton(onClick = { navController.popBackStack() }) {
                Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
            }
            Text("My Location", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        }

        when {
            !permissionState.status.isGranted -> Text(
                "Location permission is required to show and share your current position."
            )
            location == null -> Box(Modifier.fillMaxWidth().height(300.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Red)
            }
            else -> {
                val cameraPositionState = rememberCameraPositionState {
                    position = CameraPosition.fromLatLngZoom(location!!, 16f)
                }
                GoogleMap(
                    modifier = Modifier.fillMaxWidth().height(350.dp),
                    cameraPositionState = cameraPositionState
                ) {
                    Marker(state = MarkerState(position = location!!), title = "You are here")
                }

                Spacer(Modifier.height(16.dp))

                Button(
                    onClick = {
                        val geoUri = "https://maps.google.com/maps?q=${location!!.latitude},${location!!.longitude}"
                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_TEXT, "This is my current location: $geoUri")
                        }
                        context.startActivity(Intent.createChooser(shareIntent, "Share location"))
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Red),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Filled.Share, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text("Share my location")
                }
            }
        }
    }
}
