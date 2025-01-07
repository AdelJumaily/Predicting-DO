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
                        text: 'Time (minutes)'
                    }
                }
            }
        }
    });
}

// Switch between manual and CSV upload tabs
function switchTab(tabName) {
    // Update button states
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');

    // Update tab content visibility
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    if (tabName === 'manual') {
        document.getElementById('manual-entry').classList.add('active');
    } else {
        document.getElementById('csv-upload').classList.add('active');
    }
}

// Add manual measurement
function addMeasurement() {
    const time = parseFloat(document.getElementById('time').value);
    const do_level = parseFloat(document.getElementById('do').value);
    const turbidity = parseFloat(document.getElementById('turbidity').value);
    const ph = parseFloat(document.getElementById('ph').value);

    if (isNaN(time) || isNaN(do_level) || isNaN(turbidity) || isNaN(ph)) {
        alert('Please fill in all fields with valid numbers');
        return;
    }

    measurements.push({
        time,
        do_level,
        turbidity,
        ph
    });

    // Sort measurements by time
    measurements.sort((a, b) => a.time - b.time);
    
    // Update displays
    updateTable();
    updateChart();
    
    // Clear input fields
    document.getElementById('time').value = '';
    document.getElementById('do').value = '';
    document.getElementById('turbidity').value = '';
    document.getElementById('ph').value = '';
}

// Convert time to minutes for consistent calculations
function convertToMinutes(value, unit) {
    switch(unit) {
        case 'hours': return value * 60;
        case 'days': return value * 24 * 60;
        case 'weeks': return value * 7 * 24 * 60;
        case 'months': return value * 30 * 24 * 60; // approximate
        case 'years': return value * 365 * 24 * 60; // approximate
        default: return value;
    }
}

// Predict DO level
function predictDO() {
    if (measurements.length < 2) {
        alert('Please add at least 2 measurements first');
        return;
    }

    const timeValue = parseFloat(document.getElementById('timeValue').value);
    const timeUnit = document.getElementById('timeUnit').value;

    if (!timeValue || timeValue <= 0) {
        alert('Please enter a valid time value');
        return;
    }

    const futureTimeMinutes = convertToMinutes(timeValue, timeUnit);
    const times = measurements.map(m => m.time);
    const do_levels = measurements.map(m => m.do_level);
    
    // Calculate regression
    const regression = linearRegression(times, do_levels);
    
    // Predict DO level
    const predictedDO = regression.slope * futureTimeMinutes + regression.intercept;

    // Update prediction display
    displayPrediction(predictedDO, timeValue, timeUnit);
    
    // Update chart with prediction
    updateChartWithPrediction(regression, futureTimeMinutes, predictedDO);
}

// Display prediction result
function displayPrediction(predictedDO, timeValue, timeUnit) {
    const resultDiv = document.getElementById('prediction-result');
    resultDiv.innerHTML = `
        <h3>Prediction Results:</h3>
        <p>Predicted DO Level in ${timeValue} ${timeUnit}: <strong>${predictedDO.toFixed(2)} mg/L</strong></p>
        <p>Based on ${measurements.length} historical measurements</p>
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

// Update the data table
function updateTable() {
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';
    
    measurements.forEach(m => {
        const row = tbody.insertRow();
        row.insertCell().textContent = m.time;
        row.insertCell().textContent = m.do_level.toFixed(2);
        row.insertCell().textContent = m.turbidity.toFixed(2);
        row.insertCell().textContent = m.ph.toFixed(2);
    });
}

// Update the chart
function updateChart() {
    chart.data.datasets[0].data = measurements.map(m => ({
        x: m.time,
        y: m.do_level
    }));
    
    // Reset prediction line when new data is added
    chart.data.datasets[1].data = [];
    
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
                // Clear existing measurements
                measurements = [];
                
                // Process each row
                results.data.forEach((row, index) => {
                    const timeValue = row.time || row.Time || row.TIME;
                    const doValue = row.do_level || row.DO || row['Dissolved Oxygen'] || row.do;
                    const turbidityValue = row.turbidity || row.Turbidity || row.TURBIDITY;
                    const phValue = row.ph || row.pH || row.PH;
                    
                    if (timeValue !== undefined && doValue !== undefined && 
                        turbidityValue !== undefined && phValue !== undefined) {
                        
                        const measurement = {
                            time: parseFloat(timeValue),
                            do_level: parseFloat(doValue),
                            turbidity: parseFloat(turbidityValue),
                            ph: parseFloat(phValue)
                        };
                        
                        if (!isNaN(measurement.time) && !isNaN(measurement.do_level) && 
                            !isNaN(measurement.turbidity) && !isNaN(measurement.ph)) {
                            measurements.push(measurement);
                        }
                    }
                });

                // Sort measurements by time
                measurements.sort((a, b) => a.time - b.time);
                
                // Update displays
                updateTable();
                updateChart();
                
                alert('CSV data loaded successfully!');
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
    // Start with manual entry tab active
    switchTab('manual');
});