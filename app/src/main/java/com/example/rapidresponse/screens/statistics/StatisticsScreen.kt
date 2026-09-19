package com.example.rapidresponse.screens.statistics

import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.example.rapidresponse.model.AlertStats
import com.example.rapidresponse.model.CountEntry
import com.example.rapidresponse.ui.components.ScreenHeader
import com.example.rapidresponse.ui.theme.Blue
import com.example.rapidresponse.ui.theme.Red
import com.patrykandpatrick.vico.compose.axis.horizontal.bottomAxis
import com.patrykandpatrick.vico.compose.axis.vertical.startAxis
import com.patrykandpatrick.vico.compose.chart.Chart
import com.patrykandpatrick.vico.compose.chart.column.columnChart
import com.patrykandpatrick.vico.compose.chart.line.lineChart
import com.patrykandpatrick.vico.compose.component.shape.shader.fromBrush
import com.patrykandpatrick.vico.compose.style.ChartStyle
import com.patrykandpatrick.vico.compose.style.ProvideChartStyle
import com.patrykandpatrick.vico.core.DefaultAlpha
import com.patrykandpatrick.vico.core.DefaultColors
import com.patrykandpatrick.vico.core.DefaultDimens
import com.patrykandpatrick.vico.core.axis.AxisPosition
import com.patrykandpatrick.vico.core.axis.formatter.AxisValueFormatter
import com.patrykandpatrick.vico.core.chart.line.LineChart
import com.patrykandpatrick.vico.core.component.shape.LineComponent
import com.patrykandpatrick.vico.core.component.shape.Shapes
import com.patrykandpatrick.vico.core.component.shape.shader.DynamicShaders
import com.patrykandpatrick.vico.core.entry.entryModelOf

@Composable
fun StatisticsScreen(navController: NavController, viewModel: StatisticsViewModel = hiltViewModel()) {
    val stats by viewModel.stats.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val error by viewModel.error.collectAsState()

    Column(modifier = Modifier.fillMaxSize().padding(20.dp)) {
        ScreenHeader(title = "Alert Statistics", onBack = { navController.popBackStack() })
        Text(
            "A campus-wide picture of reported alerts: what's most common, how urgent, and when.",
            fontSize = 13.sp,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Red)
            }
            error != null -> Text(error ?: "Something went wrong", color = MaterialTheme.colorScheme.error)
            stats == null || stats!!.totalAlerts == 0 -> Text("No alerts have been reported yet.")
            else -> StatisticsContent(stats!!)
        }
    }
}

@Composable
private fun StatisticsContent(stats: AlertStats) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        SummaryRow(stats)

        if (stats.byType.isNotEmpty()) {
            ChartCard(title = "Alerts by Type", accent = Red) {
                CountBarChart(entries = stats.byType, color = Red)
            }
        }

        if (stats.byPriority.isNotEmpty()) {
            ChartCard(title = "Alerts by Priority", accent = Blue) {
                CountBarChart(entries = stats.byPriority, color = Blue)
            }
        }

        ChartCard(title = "Alerts by Day of Week", accent = Red) {
            Column {
                CountLineChart(entries = stats.byDayOfWeek, color = Red)
                stats.busiestDay?.let {
                    Text(
                        "Busiest day: $it",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = Red,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun SummaryRow(stats: AlertStats) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
        StatTile("Total", stats.totalAlerts.toString(), Modifier.weight(1f))
        StatTile("Active", stats.activeAlerts.toString(), Modifier.weight(1f))
        StatTile("Investigating", stats.investigatingAlerts.toString(), Modifier.weight(1f))
        StatTile("Resolved", stats.resolvedAlerts.toString(), Modifier.weight(1f))
    }
}

@Composable
private fun StatTile(label: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFFF5F5F5))
            .padding(vertical = 14.dp, horizontal = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(value, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Text(label, fontSize = 11.sp, color = Color.Gray)
    }
}

@Composable
private fun ChartCard(title: String, accent: Color, content: @Composable () -> Unit) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color(0xFFF5F5F5),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(title, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = accent)
            Spacer(Modifier.height(8.dp))
            content()
        }
    }
}

@Composable
private fun CountBarChart(entries: List<CountEntry>, color: Color) {
    val model = entryModelOf(*entries.map { it.count.toFloat() }.toTypedArray())
    val labels = entries.map { it.label.replaceFirstChar { c -> c.uppercase() } }
    val bottomFormatter = AxisValueFormatter<AxisPosition.Horizontal.Bottom> { x, _ ->
        labels.getOrElse(x.toInt()) { "" }
    }
    ProvideChartStyle(rememberBarChartStyle(color)) {
        Chart(
            chart = columnChart(),
            model = model,
            modifier = Modifier.fillMaxWidth().height(180.dp),
            startAxis = startAxis(guideline = null),
            bottomAxis = bottomAxis(valueFormatter = bottomFormatter)
        )
    }
}

@Composable
private fun CountLineChart(entries: List<CountEntry>, color: Color) {
    val model = entryModelOf(*entries.map { it.count.toFloat() }.toTypedArray())
    val labels = entries.map { it.label }
    val bottomFormatter = AxisValueFormatter<AxisPosition.Horizontal.Bottom> { x, _ ->
        labels.getOrElse(x.toInt()) { "" }
    }
    ProvideChartStyle(rememberLineChartStyle(color)) {
        Chart(
            chart = lineChart(),
            model = model,
            modifier = Modifier.fillMaxWidth().height(180.dp),
            startAxis = startAxis(guideline = null),
            bottomAxis = bottomAxis(valueFormatter = bottomFormatter)
        )
    }
}

@Composable
private fun rememberBarChartStyle(color: Color): ChartStyle {
    val defaultColors = if (isSystemInDarkTheme()) DefaultColors.Dark else DefaultColors.Light
    return remember(color) {
        ChartStyle(
            axis = ChartStyle.Axis(
                axisLabelColor = Color(defaultColors.axisLabelColor),
                axisGuidelineColor = Color(defaultColors.axisGuidelineColor),
                axisLineColor = Color(defaultColors.axisLineColor)
            ),
            columnChart = ChartStyle.ColumnChart(
                listOf(
                    LineComponent(
                        color.toArgb(),
                        DefaultDimens.COLUMN_WIDTH,
                        Shapes.roundedCornerShape(DefaultDimens.COLUMN_ROUNDNESS_PERCENT)
                    )
                )
            ),
            lineChart = ChartStyle.LineChart(emptyList()),
            marker = ChartStyle.Marker(),
            elevationOverlayColor = Color(defaultColors.elevationOverlayColor)
        )
    }
}

@Composable
private fun rememberLineChartStyle(color: Color): ChartStyle {
    val defaultColors = if (isSystemInDarkTheme()) DefaultColors.Dark else DefaultColors.Light
    return remember(color) {
        ChartStyle(
            axis = ChartStyle.Axis(
                axisLabelColor = Color(defaultColors.axisLabelColor),
                axisGuidelineColor = Color(defaultColors.axisGuidelineColor),
                axisLineColor = Color(defaultColors.axisLineColor)
            ),
            columnChart = ChartStyle.ColumnChart(emptyList()),
            lineChart = ChartStyle.LineChart(
                listOf(
                    LineChart.LineSpec(
                        lineColor = color.toArgb(),
                        lineBackgroundShader = DynamicShaders.fromBrush(
                            androidx.compose.ui.graphics.Brush.verticalGradient(
                                listOf(
                                    color.copy(alpha = DefaultAlpha.LINE_BACKGROUND_SHADER_START),
                                    color.copy(alpha = DefaultAlpha.LINE_BACKGROUND_SHADER_END)
                                )
                            )
                        )
                    )
                )
            ),
            marker = ChartStyle.Marker(),
            elevationOverlayColor = Color(defaultColors.elevationOverlayColor)
        )
    }
}
