package com.example.rapidresponse.screens.contacts

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
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
import com.example.rapidresponse.ui.components.ScreenHeader
import com.example.rapidresponse.ui.theme.Red

@Composable
fun ContactsScreen(navController: NavController, viewModel: ContactsViewModel = hiltViewModel()) {
    val contacts by viewModel.contacts.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val error by viewModel.error.collectAsState()
    val isStaff by viewModel.isStaff.collectAsState()
    val actionError by viewModel.actionError.collectAsState()
    var showAddDialog by remember { mutableStateOf(false) }

    if (showAddDialog) {
        AddContactDialog(
            onDismiss = {
                showAddDialog = false
                viewModel.clearActionError()
            },
            onSave = { contact -> viewModel.addContact(contact) { showAddDialog = false } },
            error = actionError
        )
    }

    Column(modifier = Modifier.fillMaxSize().padding(20.dp)) {
        ScreenHeader(title = "Emergency Contacts", onBack = { navController.popBackStack() })
        if (isStaff) {
            Button(
                onClick = { showAddDialog = true },
                colors = ButtonDefaults.buttonColors(containerColor = Red),
                modifier = Modifier.padding(bottom = 8.dp)
            ) {
                Icon(Icons.Filled.Add, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("Add contact")
            }
            actionError?.takeUnless { showAddDialog }?.let {
                Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
            }
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
                items(contacts) { contact ->
                    ContactRow(contact, isStaff) { viewModel.setAvailability(contact, it) }
                }
            }
        }
    }
}

@Composable
private fun ContactRow(
    contact: EmergencyContact,
    isStaff: Boolean,
    onAvailabilityChange: (Boolean) -> Unit
) {
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
        if (isStaff) {
            Switch(checked = contact.available, onCheckedChange = onAvailabilityChange)
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

@Composable
@OptIn(ExperimentalMaterial3Api::class)
private fun AddContactDialog(onDismiss: () -> Unit, onSave: (EmergencyContact) -> Unit, error: String?) {
    var name by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var department by remember { mutableStateOf("") }
    val valid = listOf(name, role, phone, email, department).all { it.isNotBlank() }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add contact") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(name, { name = it }, label = { Text("Name") }, singleLine = true)
                OutlinedTextField(role, { role = it }, label = { Text("Role") }, singleLine = true)
                OutlinedTextField(phone, { phone = it }, label = { Text("Phone") }, singleLine = true)
                OutlinedTextField(email, { email = it }, label = { Text("Email") }, singleLine = true)
                OutlinedTextField(department, { department = it }, label = { Text("Department") }, singleLine = true)
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp) }
            }
        },
        confirmButton = {
            TextButton(
                enabled = valid,
                onClick = {
                    onSave(
                        EmergencyContact(
                            name = name.trim(),
                            role = role.trim(),
                            phone = phone.trim(),
                            email = email.trim(),
                            department = department.trim()
                        )
                    )
                }
            ) { Text("Save", color = Red) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}
