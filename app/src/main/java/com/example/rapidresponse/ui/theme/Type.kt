package com.example.rapidresponse.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.example.rapidresponse.R

val Archivo = FontFamily(
    Font(R.font.archivo_regular, FontWeight.Normal),
    Font(R.font.archivo_medium, FontWeight.Medium),
    Font(R.font.archivo_semibold, FontWeight.SemiBold),
    Font(R.font.archivo_bold, FontWeight.Bold),
    Font(R.font.archivo_black, FontWeight.Black)
)

// The heavy, tightly tracked style behind headlines like "TAP FOR EMERGENCY".
val DisplayStyle = TextStyle(
    fontFamily = Archivo,
    fontWeight = FontWeight.Black,
    letterSpacing = (-0.5).sp
)

// Small, wide-tracked uppercase labels, e.g. "QUICK ACTIONS".
val EyebrowStyle = TextStyle(
    fontFamily = Archivo,
    fontWeight = FontWeight.SemiBold,
    fontSize = 12.sp,
    letterSpacing = 1.5.sp
)

val Typography = Typography(
    displayLarge = DisplayStyle.copy(fontSize = 48.sp, lineHeight = 52.sp),
    displayMedium = DisplayStyle.copy(fontSize = 36.sp, lineHeight = 40.sp),
    displaySmall = DisplayStyle.copy(fontSize = 30.sp, lineHeight = 34.sp),
    headlineLarge = TextStyle(
        fontFamily = Archivo,
        fontWeight = FontWeight.Bold,
        fontSize = 28.sp,
        lineHeight = 34.sp,
        letterSpacing = (-0.25).sp
    ),
    headlineMedium = TextStyle(
        fontFamily = Archivo,
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
        lineHeight = 30.sp
    ),
    headlineSmall = TextStyle(
        fontFamily = Archivo,
        fontWeight = FontWeight.Bold,
        fontSize = 20.sp,
        lineHeight = 26.sp
    ),
    titleLarge = TextStyle(
        fontFamily = Archivo,
        fontWeight = FontWeight.SemiBold,
        fontSize = 18.sp,
        lineHeight = 24.sp
    ),
    titleMedium = TextStyle(
        fontFamily = Archivo,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 22.sp
    ),
    titleSmall = TextStyle(
        fontFamily = Archivo,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        lineHeight = 20.sp
    ),
    bodyLarge = TextStyle(
        fontFamily = Archivo,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = Archivo,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp
    ),
    bodySmall = TextStyle(
        fontFamily = Archivo,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 16.sp
    ),
    labelLarge = TextStyle(
        fontFamily = Archivo,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        letterSpacing = 0.1.sp
    ),
    labelMedium = EyebrowStyle,
    labelSmall = EyebrowStyle.copy(fontSize = 11.sp, letterSpacing = 1.sp)
)
