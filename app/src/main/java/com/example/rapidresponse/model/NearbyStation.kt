package com.example.rapidresponse.model

import com.google.android.gms.maps.model.LatLng

data class NearbyStation(
    val name: String,
    val address: String,
    val location: LatLng,
    val distanceMeters: Double
)
