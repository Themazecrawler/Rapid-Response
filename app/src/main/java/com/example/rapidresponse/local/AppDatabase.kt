package com.example.rapidresponse.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [PendingAlertEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun pendingAlertDao(): PendingAlertDao
}
