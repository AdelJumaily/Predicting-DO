let measurements = [];
let chart;

// Initialize the chart
function initChart() {
    const ctx = document.getElementById('measurementChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Dissolved Oxygen (mg/L)',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                pointRadius: 3,
                showLine: true
            }, {
                label: 'Trend Line',
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
                    },
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            return Math.floor(value);
                        }
                    }
                }
            }
        }
    });
}

// Add new measurement
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

    consolidateData();
    updateTable();
    updateChart();
}

// Consolidate measurements at same time points
function consolidateData() {
    const groupedData = {};
    
    // Group measurements by time and calculate averages
    measurements.forEach(m => {
        if (!groupedData[m.time]) {
            groupedData[m.time] = {
                time: m.time,
                do_sum: 0,
                turbidity_sum: 0,
                ph_sum: 0,
                count: 0
            };
        }
        groupedData[m.time].do_sum += m.do_level;
        groupedData[m.time].turbidity_sum += m.turbidity;
        groupedData[m.time].ph_sum += m.ph;
        groupedData[m.time].count++;
    });

    // Convert back to array with averages
    measurements = Object.values(groupedData).map(g => ({
        time: g.time,
        do_level: g.do_sum / g.count,
        turbidity: g.turbidity_sum / g.count,
        ph: g.ph_sum / g.count
    }));

    // Sort by time
    measurements.sort((a, b) => a.time - b.time);
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
    chart.data.labels = measurements.map(m => m.time);
    chart.data.datasets[0].data = measurements.map(m => ({
        x: m.time,
        y: m.do_level
    }));
    
    // Calculate trend line if we have data
    if (measurements.length > 0) {
        const times = measurements.map(m => m.time);
        const do_levels = measurements.map(m => m.do_level);
        const regression = linearRegression(times, do_levels);
        
        // Create trend line points
        const trendLine = [];
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        
        // Add trend line point at start
        trendLine.push({
            x: minTime,
            y: regression.slope * minTime + regression.intercept
        });
        
        // Add trend line point at end
        trendLine.push({
            x: maxTime,
            y: regression.slope * maxTime + regression.intercept
        });
        
        chart.data.datasets[1].data = trendLine;
    }
    
    chart.update();
}

// Simple linear regression
function linearRegression(x, y) {
    const n = x.length;
    let sum_x = 0;
    let sum_y = 0;
    let sum_xy = 0;
    let sum_xx = 0;

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

// Function to handle CSV upload
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
            console.log("Parsing results:", results);
            console.log("Headers:", results.meta.fields);
            console.log("First row:", results.data[0]);

            if (results.data && results.data.length > 0) {
                // Clear existing measurements
                measurements = [];
                
                // Process each row
                results.data.forEach((row, index) => {
                    console.log(`Processing row ${index}:`, row);
                    
                    // Try to find the correct column names
                    const timeValue = row.time || row.Time || row.TIME;
                    const doValue = row.do_level || row.DO || row['Dissolved Oxygen'] || row.do;
                    const turbidityValue = row.turbidity || row.Turbidity || row.TURBIDITY;
                    const phValue = row.ph || row.pH || row.PH;

                    console.log(`Found values:`, {
                        time: timeValue,
                        do: doValue,
                        turbidity: turbidityValue,
                        ph: phValue
                    });

                    if (timeValue !== undefined && doValue !== undefined && 
                        turbidityValue !== undefined && phValue !== undefined) {
                        
                        const measurement = {
                            time: parseFloat(timeValue),
                            do_level: parseFloat(doValue),
                            turbidity: parseFloat(turbidityValue),
                            ph: parseFloat(phValue)
                        };

                        console.log("Created measurement:", measurement);
                        
                        if (!isNaN(measurement.time) && !isNaN(measurement.do_level) && 
                            !isNaN(measurement.turbidity) && !isNaN(measurement.ph)) {
                            measurements.push(measurement);
                        } else {
                            console.log("Skipping row due to NaN values");
                        }
                    }
                });

                console.log("Final measurements array:", measurements);

                // Sort measurements by time
                measurements.sort((a, b) => a.time - b.time);
                
                // Update display
                consolidateData();
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
initChart();