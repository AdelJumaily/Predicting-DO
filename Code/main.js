let measurements = [];
let chart;

// Initialize the chart
function initChart() {
    const ctx = document.getElementById('measurementChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Historical DO Levels',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                pointRadius: 3,
                showLine: true
            }, {
                label: 'Prediction Line',
                data: [],
                borderColor: 'rgb(255, 99, 132)',
                borderWidth: 2,
                pointRadius: 0,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Dissolved Oxygen (mg/L)'
                    }
                },
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Time (hours)'
                    }
                }
            }
        }
    });
}

// Convert time to hours for consistent calculations
function convertToHours(value, unit) {
    switch(unit) {
        case 'hours': return value;
        case 'days': return value * 24;
        case 'weeks': return value * 24 * 7;
        case 'months': return value * 24 * 30; // approximate
        case 'years': return value * 24 * 365; // approximate
        default: return value;
    }
}

// Predict DO level
function predictDO() {
    if (measurements.length < 2) {
        alert('Please upload historical data first');
        return;
    }

    const timeValue = parseFloat(document.getElementById('timeValue').value);
    const timeUnit = document.getElementById('timeUnit').value;

    if (!timeValue || timeValue <= 0) {
        alert('Please enter a valid time value');
        return;
    }

    const futureTimeHours = convertToHours(timeValue, timeUnit);
    const times = measurements.map(m => m.time);
    const do_levels = measurements.map(m => m.do_level);
    
    // Calculate seasonal components if enough data
    const seasonalPattern = calculateSeasonalPattern(measurements);
    const regression = linearRegression(times, do_levels);
    
    // Predict base value using linear regression
    const baseValue = regression.slope * futureTimeHours + regression.intercept;
    
    // Add seasonal adjustment if available
    const seasonalAdjustment = seasonalPattern[Math.floor(futureTimeHours % 24)] || 0;
    const predictedDO = baseValue + seasonalAdjustment;

    // Update prediction display
    displayPrediction(predictedDO, timeValue, timeUnit);
    
    // Update chart with prediction
    updateChartWithPrediction(regression, futureTimeHours, predictedDO);
}

// Calculate seasonal patterns in the data
function calculateSeasonalPattern(data) {
    if (data.length < 24) return {}; // Need at least 24 hours of data
    
    const hourlyAverages = {};
    const hourlyCount = {};
    
    // Group by hour and calculate averages
    data.forEach(m => {
        const hour = Math.floor(m.time % 24);
        if (!hourlyAverages[hour]) {
            hourlyAverages[hour] = 0;
            hourlyCount[hour] = 0;
        }
        hourlyAverages[hour] += m.do_level;
        hourlyCount[hour]++;
    });
    
    // Calculate average for each hour
    Object.keys(hourlyAverages).forEach(hour => {
        hourlyAverages[hour] = hourlyAverages[hour] / hourlyCount[hour];
    });
    
    return hourlyAverages;
}

// Display prediction result
function displayPrediction(predictedDO, timeValue, timeUnit) {
    const resultDiv = document.getElementById('prediction-result');
    resultDiv.innerHTML = `
        <h3>Prediction Results:</h3>
        <p>Predicted DO Level in ${timeValue} ${timeUnit}: <strong>${predictedDO.toFixed(2)} mg/L</strong></p>
        <p>Confidence Level: Medium (based on historical data patterns)</p>
    `;
    resultDiv.classList.add('has-prediction');
}

// Update chart with prediction line
function updateChartWithPrediction(regression, futureTime, predictedValue) {
    const lastTime = measurements[measurements.length - 1].time;
    
    // Create prediction line
    const predictionLine = [
        { x: lastTime, y: regression.slope * lastTime + regression.intercept },
        { x: futureTime, y: predictedValue }
    ];
    
    chart.data.datasets[1].data = predictionLine;
    chart.options.scales.x.max = futureTime;
    chart.update();
}

// Linear regression calculation
function linearRegression(x, y) {
    const n = x.length;
    let sum_x = 0, sum_y = 0, sum_xy = 0, sum_xx = 0;
    
    for (let i = 0; i < n; i++) {
        sum_x += x[i];
        sum_y += y[i];
        sum_xy += x[i] * y[i];
        sum_xx += x[i] * x[i];
    }
    
    const slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x);
    const intercept = (sum_y - slope * sum_x) / n;
    
    return { slope, intercept };
}

// Update data summary
function updateDataSummary() {
    if (measurements.length === 0) return;
    
    const do_levels = measurements.map(m => m.do_level);
    document.getElementById('avgDO').textContent = (do_levels.reduce((a, b) => a + b, 0) / do_levels.length).toFixed(2);
    document.getElementById('minDO').textContent = Math.min(...do_levels).toFixed(2);
    document.getElementById('maxDO').textContent = Math.max(...do_levels).toFixed(2);
    document.getElementById('dataPoints').textContent = measurements.length;
}

// Handle CSV upload
function uploadCSV() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a CSV file');
        return;
    }

    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
            if (results.data && results.data.length > 0) {
                measurements = [];
                
                results.data.forEach((row, index) => {
                    const timeValue = row.time || row.Time || row.TIME;
                    const doValue = row.do_level || row.DO || row['Dissolved Oxygen'] || row.do;
                    
                    if (timeValue !== undefined && doValue !== undefined) {
                        const measurement = {
                            time: parseFloat(timeValue),
                            do_level: parseFloat(doValue)
                        };
                        
                        if (!isNaN(measurement.time) && !isNaN(measurement.do_level)) {
                            measurements.push(measurement);
                        }
                    }
                });

                // Sort measurements by time
                measurements.sort((a, b) => a.time - b.time);
                
                // Update chart with historical data
                chart.data.datasets[0].data = measurements.map(m => ({
                    x: m.time,
                    y: m.do_level
                }));
                
                // Reset prediction line
                chart.data.datasets[1].data = [];
                
                // Update chart scales
                const maxTime = Math.max(...measurements.map(m => m.time));
                chart.options.scales.x.max = maxTime;
                chart.update();
                
                // Update summary statistics
                updateDataSummary();
                
                alert('Data loaded successfully!');
            } else {
                alert('No valid data found in CSV file');
            }
        },
        error: function(error) {
            console.error('Error:', error);
            alert('Error parsing CSV file');
        }
    });
}

// Initialize the chart when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initChart();
});