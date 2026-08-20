package com.example.rapidresponse.screens.location

import android.Manifest
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Directions
import androidx.compose.material.icons.filled.LocalPolice
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.navigation.NavController
import com.example.rapidresponse.model.NearbyStation
import com.example.rapidresponse.ui.components.ScreenHeader
import com.example.rapidresponse.ui.theme.Red
import com.example.rapidresponse.utils.findNearbyPoliceStations
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.tasks.CancellationTokenSource
import com.google.android.libraries.places.api.Places
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
import com.google.maps.android.compose.rememberCameraPositionState
import kotlinx.coroutines.tasks.await

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun LocationScreen(navController: NavController) {
    val context = LocalContext.current
    val placesClient = remember { Places.createClient(context) }
    val permissionState = rememberPermissionState(Manifest.permission.ACCESS_FINE_LOCATION)
    var location by remember { mutableStateOf<LatLng?>(null) }
    var stations by remember { mutableStateOf<List<NearbyStation>>(emptyList()) }
    var loadingStations by remember { mutableStateOf(false) }

    LaunchedEffect(permissionState.status.isGranted) {
        if (!permissionState.status.isGranted) {
            permissionState.launchPermissionRequest()
            return@LaunchedEffect
        }
        val client = LocationServices.getFusedLocationProviderClient(context)
        val loc = try {
            client.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, CancellationTokenSource().token).await()
        } catch (e: Exception) {
            null
        }
        if (loc != null) location = LatLng(loc.latitude, loc.longitude)
    }

    LaunchedEffect(location) {
        val here = location ?: return@LaunchedEffect
        loadingStations = true
        stations = findNearbyPoliceStations(placesClient, here.latitude, here.longitude)
        loadingStations = false
    }

    Column(modifier = Modifier.fillMaxSize().padding(20.dp)) {
        ScreenHeader(title = "My Location", onBack = { navController.popBackStack() })

        when {
            !permissionState.status.isGranted -> Text(
                "Location permission is required to show and share your current position."
            )
            location == null -> Box(Modifier.fillMaxWidth().height(300.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Red)
            }
            else -> Column(
                modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())
            ) {
                val cameraPositionState = rememberCameraPositionState {
                    position = CameraPosition.fromLatLngZoom(location!!, 15f)
                }
                GoogleMap(
                    modifier = Modifier.fillMaxWidth().height(280.dp),
                    cameraPositionState = cameraPositionState
                ) {
                    Marker(state = MarkerState(position = location!!), title = "You are here")
                    stations.forEach { station ->
                        Marker(
                            state = MarkerState(position = station.location),
                            title = station.name,
                            snippet = station.address
                        )
                    }
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

                Spacer(Modifier.height(24.dp))

                Text("Nearby Police Stations", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(10.dp))

                when {
                    loadingStations -> Box(Modifier.fillMaxWidth().padding(vertical = 20.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Red)
                    }
                    stations.isEmpty() -> Text(
                        "No nearby police stations found.",
                        fontSize = 13.sp,
                        color = Color.Gray
                    )
                    else -> Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        stations.forEach { station -> StationRow(station) }
                    }
                }
            }
        }
    }
}

@Composable
private fun StationRow(station: NearbyStation) {
    val context = LocalContext.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFFF5F5F5))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Filled.LocalPolice, contentDescription = null, tint = Red, modifier = Modifier.size(28.dp))
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(station.name, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Text(station.address, fontSize = 12.sp, color = Color.Gray)
            Text(
                "%.1f km away".format(station.distanceMeters / 1000.0),
                fontSize = 12.sp,
                color = Red
            )
        }
        IconButton(onClick = {
            val geoUri = "https://maps.google.com/maps?daddr=${station.location.latitude},${station.location.longitude}"
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(geoUri))
            ContextCompat.startActivity(context, intent, null)
        }) {
            Icon(Icons.Filled.Directions, contentDescription = "Directions to ${station.name}", tint = Red)
        }
    }
}
