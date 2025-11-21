// =====================
//  GLOBAL CHART REFS
// =====================
let lineChart, barChart, doughnutChart, stackedChart;

function formatNumber(n) {
  return Number(n).toFixed(2);
}


function updateFinancialStats(stats) {
  const get = id => document.getElementById(id);
  if (!stats) return;

  if (get("opd_income_stat"))
    get("opd_income_stat").textContent =
      `${stats.opd_income.amount} / ${stats.opd_income.count}`;

  if (get("dental_income_stat"))
    get("dental_income_stat").textContent =
      `${stats.dental_income.amount} / ${stats.dental_income.count}`;

  if (get("dental_opd_stat"))
    get("dental_opd_stat").textContent =
      `${stats.dental_opd.amount} / ${stats.dental_opd.count}`;

  if (get("physio_bill_stat"))
    get("physio_bill_stat").textContent =
      `${stats.physiotherapy_bill.amount} / ${stats.physiotherapy_bill.count}`;

  if (get("physio_opd_stat"))
    get("physio_opd_stat").textContent =
      `${stats.physiotherpay_opd.amount} / ${stats.physiotherpay_opd.count}`;
}


function renderEmptyCharts() {
  const ctxLine = document.getElementById('lineChart').getContext('2d');
  const ctxBar = document.getElementById('barChart').getContext('2d');
  const ctxDough = document.getElementById('doughnutChart').getContext('2d');
  const ctxStack = document.getElementById('stackedChart').getContext('2d');

  lineChart = new Chart(ctxLine, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Total', data: [], fill: true }] },
    options: { responsive: true, maintainAspectRatio: false }
  });

  barChart = new Chart(ctxBar, {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Category', data: [] }] },
    options: { responsive: true, maintainAspectRatio: false }
  });

  doughnutChart = new Chart(ctxDough, {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [] }] },
    options: { responsive: true, maintainAspectRatio: false }
  });

  stackedChart = new Chart(ctxStack, {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true },
        y: { stacked: true }
      }
    }
  });
}

// =====================
//   UPDATE STATS + TABLE
// =====================
function updateStatsAndTable(resp) {
  const records = resp.records || [];
  const total = records.reduce((s, r) => s + Number(r.value || 0), 0);

  document.getElementById('statCount').innerText = records.length;
  document.getElementById('statSum').innerText = formatNumber(total);
  document.getElementById('statAvg').innerText =
    records.length ? formatNumber(total / records.length) : '—';
  document.getElementById('statCats').innerText =
    (resp.categories || []).length;

  const tbody = document.getElementById('recordsTbody');
  tbody.innerHTML = '';

  records
    .slice()
    .reverse()
    .slice(0, 50)
    .forEach((r) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${r.id}</td>
        <td>${r.label}</td>
        <td>${r.category}</td>
        <td>${formatNumber(r.value)}</td>
        <td>${new Date(r.created_at).toLocaleString()}</td>
      `;
      tbody.appendChild(row);
    });
}

// =====================
//   FETCH + UPDATE
// =====================
function fetchDataAndUpdate() {
  const q = document.getElementById('searchInput').value.trim();
  const fromVal = document.getElementById('fromInput').value;
  const toVal = document.getElementById('toInput').value;

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (fromVal) params.set('from', fromVal);
  if (toVal) params.set('to', toVal);

  fetch('/api/data?' + params.toString())
    .then(r => r.json())
    .then(resp => {

      // 🔥 1) Update your new financial stats (amount / count)
     
      updateFinancialStats(resp.stats);

      // 🔥 2) Update charts
      const ts = resp.timeseries || [];
      const labels = ts.map(x => x.date);
      const data = ts.map(x => x.total);

      lineChart.data.labels = labels;
      lineChart.data.datasets = [{ label: 'Total', data: data, fill: true }];
      lineChart.update();

      const cats = resp.categories || [];
      barChart.data.labels = cats.map(x => x.category);
      barChart.data.datasets = [{ label: 'Sum', data: cats.map(x => x.total) }];
      barChart.update();

      const top = resp.top_labels || [];
      doughnutChart.data.labels = top.map(x => x.label);
      doughnutChart.data.datasets = [{ data: top.map(x => x.total) }];
      doughnutChart.update();

      const recs = resp.records || [];
      const daySet = [...new Set(
        recs.map(r => new Date(r.created_at).toISOString().split('T')[0])
      )].sort();

      const catSet = [...new Set(recs.map(r => r.category))].sort();

      const dayIndex = {};
      daySet.forEach((d, i) => dayIndex[d] = i);

      const catIndex = {};
      catSet.forEach((c, i) => catIndex[c] = i);

      const dataGrid = Array.from(
        { length: catSet.length },
        () => Array(daySet.length).fill(0)
      );

      recs.forEach(r => {
        const d = new Date(r.created_at).toISOString().split('T')[0];
        if (d in dayIndex && r.category in catIndex) {
          dataGrid[catIndex[r.category]][dayIndex[d]] += Number(r.value);
        }
      });

      stackedChart.data.labels = daySet;
      stackedChart.data.datasets = catSet.map((cat, idx) => ({
        label: cat,
        data: dataGrid[idx]
      }));
      stackedChart.update();

      // 🔥 3) Update table + general stats
      updateStatsAndTable(resp);
    })
    .catch(err => {
      console.error("Failed to fetch data:", err);
    });
}

// =====================
//   INIT
// =====================
document.addEventListener('DOMContentLoaded', function () {
  renderEmptyCharts();
  fetchDataAndUpdate();

  document.getElementById('searchBtn')
    .addEventListener('click', fetchDataAndUpdate);

  document.getElementById('searchInput')
    .addEventListener('keydown', (e) => {
      if (e.key === 'Enter') fetchDataAndUpdate();
    });
});
