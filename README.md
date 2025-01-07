# Lake Monitoring System

A web-based application for monitoring and analyzing lake water quality parameters including dissolved oxygen, turbidity, and pH levels.

## Features

- Real-time data visualization
- CSV file upload support
- Trend line analysis
- Data consolidation and averaging
- Predictive analytics for dissolved oxygen levels

## Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/lake-monitoring-system.git
```

2. Open `index.html` in your web browser

## Usage

### Manual Data Entry
1. Enter time (minutes)
2. Input dissolved oxygen level (mg/L)
3. Input turbidity level (NTU)
4. Input pH level
5. Click "Add Measurement"
6. View the updated chart and trend line

### CSV Upload
1. Prepare CSV file with columns: time, do_level, turbidity, ph
2. Click "Choose File" and select your CSV
3. Click "Upload CSV"
4. View the consolidated data visualization

## Technologies Used

- HTML5
- CSS3
- JavaScript
- Chart.js for visualization
- Papa Parse for CSV parsing