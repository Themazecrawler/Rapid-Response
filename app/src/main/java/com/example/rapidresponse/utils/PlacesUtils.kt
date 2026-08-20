package com.example.rapidresponse.utils

import android.location.Location
import android.util.Log
import com.example.rapidresponse.model.NearbyStation
import com.google.android.gms.maps.model.LatLng
import com.google.android.libraries.places.api.model.Place
import com.google.android.libraries.places.api.model.RectangularBounds
import com.google.android.libraries.places.api.model.TypeFilter
import com.google.android.libraries.places.api.net.FetchPlaceRequest
import com.google.android.libraries.places.api.net.FindAutocompletePredictionsRequest
import com.google.android.libraries.places.api.net.PlacesClient
import kotlinx.coroutines.tasks.await

private const val TAG = "PlacesUtils"
private const val SEARCH_RADIUS_DEGREES = 0.1 // roughly an 11km box around the search point
private const val MAX_RESULTS = 5

fun calculateDistanceMeters(from: LatLng, to: LatLng): Double {
    val results = FloatArray(1)
    Location.distanceBetween(from.latitude, from.longitude, to.latitude, to.longitude, results)
    return results[0].toDouble()
}

// Looks up nearby police stations via Places Autocomplete, fetches each candidate's
// coordinates, and returns them sorted by distance from the given point. Any failures
// (no network, Places API not enabled for the key, etc.) resolve to an empty list rather
// than crashing the Location screen.
suspend fun findNearbyPoliceStations(
    placesClient: PlacesClient,
    latitude: Double,
    longitude: Double
): List<NearbyStation> {
    val currentLocation = LatLng(latitude, longitude)

    val predictions = try {
        val request = FindAutocompletePredictionsRequest.builder()
            .setLocationRestriction(
                RectangularBounds.newInstance(
                    LatLng(latitude - SEARCH_RADIUS_DEGREES, longitude - SEARCH_RADIUS_DEGREES),
                    LatLng(latitude + SEARCH_RADIUS_DEGREES, longitude + SEARCH_RADIUS_DEGREES)
                )
            )
            .setTypeFilter(TypeFilter.ESTABLISHMENT)
            .setQuery("police station")
            .build()
        placesClient.findAutocompletePredictions(request).await().autocompletePredictions
    } catch (e: Exception) {
        Log.w(TAG, "Failed to search for nearby police stations", e)
        return emptyList()
    }

    val placeFields = listOf(Place.Field.NAME, Place.Field.ADDRESS, Place.Field.LAT_LNG)
    val stations = predictions.take(MAX_RESULTS).mapNotNull { prediction ->
        try {
            val place = placesClient
                .fetchPlace(FetchPlaceRequest.builder(prediction.placeId, placeFields).build())
                .await()
                .place
            val placeLatLng = place.latLng ?: return@mapNotNull null
            NearbyStation(
                name = place.name ?: prediction.getPrimaryText(null).toString(),
                address = place.address ?: prediction.getSecondaryText(null).toString(),
                location = placeLatLng,
                distanceMeters = calculateDistanceMeters(currentLocation, placeLatLng)
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to fetch place details for ${prediction.placeId}", e)
            null
        }
    }

    return stations.sortedBy { it.distanceMeters }
}
