package com.example.rapidresponse.screens.contacts

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.example.rapidresponse.model.EmergencyContact
import com.example.rapidresponse.ui.theme.Red

@Composable
fun ContactsScreen(navController: NavController, viewModel: ContactsViewModel = hiltViewModel()) {
    val contacts by viewModel.contacts.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val error by viewModel.error.collectAsState()

    Column(modifier = Modifier.fillMaxSize().padding(20.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 10.dp)) {
            IconButton(onClick = { navController.popBackStack() }) {
                Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
            }
            Text("Emergency Contacts", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        }
        Text(
            "Campus security and response staff you can call directly.",
            fontSize = 13.sp,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Red)
            }
            error != null -> Text(error ?: "Something went wrong", color = MaterialTheme.colorScheme.error)
            contacts.isEmpty() -> Text("No contacts available right now.")
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(contacts) { contact -> ContactRow(contact) }
            }
        }
    }
}

@Composable
private fun ContactRow(contact: EmergencyContact) {
    val context = LocalContext.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(androidx.compose.ui.graphics.Color(0xFFF5F5F5))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            Icons.Filled.Person,
            contentDescription = null,
            tint = Red,
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(androidx.compose.ui.graphics.Color.White)
                .padding(8.dp)
        )
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(contact.name, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
            Text("${contact.role} • ${contact.department}", fontSize = 12.sp)
            Text(contact.phone, fontSize = 12.sp)
        }
        IconButton(onClick = {
            if (ContextCompat.checkSelfPermission(context, android.Manifest.permission.CALL_PHONE)
                != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    context as Activity,
                    arrayOf(android.Manifest.permission.CALL_PHONE),
                    101
                )
            } else {
                val intent = Intent(Intent.ACTION_CALL, Uri.parse("tel:${contact.phone}"))
                ContextCompat.startActivity(context, intent, null)
            }
        }) {
            Icon(Icons.Filled.Call, contentDescription = "Call ${contact.name}", tint = Red)
        }
    }
}
