package com.example.rapidresponse.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorPalette = darkColorScheme(
    primary = Red,
    onPrimary = Color.White,
    primaryContainer = RedDark,
    onPrimaryContainer = Color.White,
    secondary = Amber,
    onSecondary = Ink,
    background = Ink,
    onBackground = Color.White,
    surface = Charcoal,
    onSurface = Color.White,
    surfaceVariant = Charcoal,
    onSurfaceVariant = Fog,
    outline = Stone,
    error = Red,
    onError = Color.White
)

private val LightColorPalette = lightColorScheme(
    primary = Red,
    onPrimary = Color.White,
    primaryContainer = LightRed,
    onPrimaryContainer = RedDark,
    secondary = Amber,
    onSecondary = Color.White,
    background = Paper,
    onBackground = Ink,
    surface = Paper,
    onSurface = Ink,
    surfaceVariant = Cloud,
    onSurfaceVariant = Stone,
    outline = Fog,
    error = Red,
    onError = Color.White
)

@Composable
fun RapidResponseTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val colors = if (darkTheme) DarkColorPalette else LightColorPalette

    MaterialTheme(
        colorScheme = colors,
        typography = Typography,
        shapes = Shapes,
        content = content
    )
}
