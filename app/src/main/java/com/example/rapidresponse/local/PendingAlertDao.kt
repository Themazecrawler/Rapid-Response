package com.example.rapidresponse.local

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface PendingAlertDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: PendingAlertEntity)

    @Update
    suspend fun update(entity: PendingAlertEntity)

    @Query("SELECT * FROM pending_alerts WHERE clientAlertId = :id")
    suspend fun getById(id: String): PendingAlertEntity?

    @Query("SELECT * FROM pending_alerts WHERE status = 'pending'")
    suspend fun getAllPendingOnce(): List<PendingAlertEntity>

    @Query("SELECT * FROM pending_alerts ORDER BY createdAtMillis DESC")
    fun observeAll(): Flow<List<PendingAlertEntity>>

    @Delete
    suspend fun delete(entity: PendingAlertEntity)

    @Query("DELETE FROM pending_alerts WHERE clientAlertId = :id")
    suspend fun deleteById(id: String)
}
