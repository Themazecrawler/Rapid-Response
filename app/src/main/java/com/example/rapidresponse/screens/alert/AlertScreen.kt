package com.example.rapidresponse.screens.alert

import android.Manifest
import android.content.pm.PackageManager
import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import com.example.rapidresponse.model.EmergencyAlert
import com.example.rapidresponse.ui.theme.Red

private val alertTypes = listOf("Medical", "Fire", "Security Threat", "Crime in Progress", "Other")
private val priorities = listOf("high", "medium", "low")

@OptIn(ExperimentalPermissionsApi::class, ExperimentalMaterial3Api::class)
@Composable
fun AlertScreen(navController: NavController, viewModel: AlertViewModel = hiltViewModel()) {
    val context = LocalContext.current
    val submitState by viewModel.submitState.collectAsState()
    val locationPermission = rememberPermissionState(Manifest.permission.ACCESS_FINE_LOCATION)

    var type by remember { mutableStateOf(alertTypes.first()) }
    var typeExpanded by remember { mutableStateOf(false) }
    var priority by remember { mutableStateOf("high") }
    var description by remember { mutableStateOf("") }
    var building by remember { mutableStateOf("") }
    var floor by remember { mutableStateOf("") }
    var latitude by remember { mutableStateOf<Double?>(null) }
    var longitude by remember { mutableStateOf<Double?>(null) }
    var capturingLocation by remember { mutableStateOf(false) }
    var phone by remember { mutableStateOf("") }

    fun captureLocation() {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED
        ) {
            locationPermission.launchPermissionRequest()
            return
        }
        capturingLocation = true
        val client = LocationServices.getFusedLocationProviderClient(context)
        client.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, CancellationTokenSource().token)
            .addOnSuccessListener { location ->
                capturingLocation = false
                if (location != null) {
                    latitude = location.latitude
                    longitude = location.longitude
                }
            }
            .addOnFailureListener { capturingLocation = false }
    }

    LaunchedEffect(locationPermission.status.isGranted) {
        if (locationPermission.status.isGranted && latitude == null) {
            captureLocation()
        }
    }

    LaunchedEffect(submitState) {
        if (submitState is SubmitState.Success) {
            Toast.makeText(
                context,
                "Alert saved - delivering to campus security now.",
                Toast.LENGTH_LONG
            ).show()
            navController.popBackStack()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 10.dp)) {
            IconButton(onClick = { navController.popBackStack() }) {
                Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
            }
            Text("Emergency Alert", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        }
        Text(
            "Fill in the details below. Your alert is saved instantly and delivered to campus " +
                "security automatically, even on a weak or dropped connection.",
            fontSize = 13.sp,
            modifier = Modifier.padding(bottom = 20.dp)
        )

        ExposedDropdownMenuBox(expanded = typeExpanded, onExpandedChange = { typeExpanded = it }) {
            OutlinedTextField(
                value = type,
                onValueChange = {},
                readOnly = true,
                label = { Text("Type") },
                modifier = Modifier.fillMaxWidth().menuAnchor()
            )
            ExposedDropdownMenu(expanded = typeExpanded, onDismissRequest = { typeExpanded = false }) {
                alertTypes.forEach { option ->
                    DropdownMenuItem(text = { Text(option) }, onClick = {
                        type = option
                        typeExpanded = false
                    })
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        Text("Priority", fontSize = 13.sp, fontWeight = FontWeight.Medium)
        Row(modifier = Modifier.padding(vertical = 6.dp)) {
            priorities.forEach { p ->
                FilterChip(
                    selected = priority == p,
                    onClick = { priority = p },
                    label = { Text(p.replaceFirstChar { it.uppercase() }) },
                    modifier = Modifier.padding(end = 8.dp)
                )
            }
        }

        Spacer(Modifier.height(8.dp))

        OutlinedTextField(
            value = description,
            onValueChange = { description = it },
            label = { Text("Description") },
            singleLine = false,
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp)
                .padding(bottom = 12.dp)
        )
        Row(modifier = Modifier.fillMaxWidth()) {
            OutlinedTextField(
                value = building, onValueChange = { building = it },
                label = { Text("Building") },
                modifier = Modifier.weight(1f).padding(end = 8.dp)
            )
            OutlinedTextField(
                value = floor, onValueChange = { floor = it },
                label = { Text("Floor") },
                modifier = Modifier.weight(1f)
            )
        }

        OutlinedTextField(
            value = phone,
            onValueChange = { phone = it },
            label = { Text("Your phone (optional)") },
            placeholder = { Text("For an SMS confirmation, e.g. +1555...") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
        )

        Spacer(Modifier.height(12.dp))

        OutlinedButton(
            onClick = { captureLocation() },
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Filled.MyLocation, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text(
                when {
                    capturingLocation -> "Capturing location..."
                    latitude != null -> "Location captured (%.4f, %.4f)".format(latitude, longitude)
                    else -> "Attach my current location"
                }
            )
        }

        Spacer(Modifier.height(20.dp))

        if (submitState is SubmitState.Error) {
            Text(
                (submitState as SubmitState.Error).message,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(bottom = 12.dp)
            )
        }

        Button(
            onClick = {
                viewModel.submitAlert(
                    EmergencyAlert(
                        type = type,
                        description = description,
                        latitude = latitude,
                        longitude = longitude,
                        building = building.ifBlank { null },
                        floor = floor.ifBlank { null },
                        priority = priority,
                        reporterPhone = phone.ifBlank { null }
                    )
                )
            },
            enabled = submitState !is SubmitState.Submitting && description.isNotBlank(),
            colors = ButtonDefaults.buttonColors(containerColor = Red),
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)
        ) {
            Text(if (submitState is SubmitState.Submitting) "Saving..." else "Send Alert")
        }
    }
}
