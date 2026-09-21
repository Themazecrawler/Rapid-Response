package com.example.rapidresponse.screens.contacts

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.example.rapidresponse.model.EmergencyContact
import com.example.rapidresponse.navigation.Screen
import com.example.rapidresponse.ui.components.BottomDestination
import com.example.rapidresponse.ui.components.BottomNavBar
import com.example.rapidresponse.ui.components.EmptyState
import com.example.rapidresponse.ui.components.ListRow
import com.example.rapidresponse.ui.components.ScreenHeader

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

    Scaffold(
        bottomBar = {
            BottomNavBar(
                current = BottomDestination.Contacts,
                onNavigate = { navController.navigate(it) },
                onSos = { navController.navigate(Screen.AlertScreen.route) }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(20.dp)) {
            ScreenHeader(title = "Emergency Contacts", onBack = { navController.popBackStack() })
            if (isStaff) {
                Button(
                    onClick = { showAddDialog = true },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                    modifier = Modifier.padding(bottom = 8.dp)
                ) {
                    Icon(Icons.Filled.Add, contentDescription = null)
                    Text("Add contact", modifier = Modifier.padding(start = 6.dp))
                }
                actionError?.takeUnless { showAddDialog }?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
            Text(
                "Campus security and response staff you can call directly.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            when {
                loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
                error != null -> Text(error ?: "Something went wrong", color = MaterialTheme.colorScheme.error)
                contacts.isEmpty() -> EmptyState("No contacts available right now.")
                else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(contacts) { contact ->
                        ContactRow(contact, isStaff) { viewModel.setAvailability(contact, it) }
                    }
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
    ListRow(
        icon = Icons.Filled.Person,
        title = contact.name,
        subtitle = "${contact.role} • ${contact.department} • ${contact.phone}",
        trailing = {
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
                Icon(Icons.Filled.Call, contentDescription = "Call ${contact.name}", tint = MaterialTheme.colorScheme.primary)
            }
        }
    )
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
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
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
            ) { Text("Save", color = MaterialTheme.colorScheme.primary) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}
