package com.example.rapidresponse.di

import android.content.Context
import androidx.room.Room
import com.example.rapidresponse.local.AppDatabase
import com.example.rapidresponse.local.PendingAlertDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Singleton
    @Provides
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "rapid_response.db").build()

    @Singleton
    @Provides
    fun providePendingAlertDao(database: AppDatabase): PendingAlertDao = database.pendingAlertDao()
}
