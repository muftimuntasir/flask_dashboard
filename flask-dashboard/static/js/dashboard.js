// =====================
//  GLOBAL CHART REFS
// =====================
let lineChart, barChart, doughnutChart, stackedChart;
let trafficChart, incomeDonutChart;

function formatNumber(n) {
  return Number(n).toFixed(2);
}

function updateFinancialStats(stats) {
  const get = id => document.getElementById(id);
  if (!stats) return;

  if (get("opd_income_stat"))
    get("opd_income_stat").textContent =
      `${stats.opd_income?.amount ?? 0} / ${stats.opd_income?.count ?? 0}`;

  if (get("dental_income_stat"))
    get("dental_income_stat").textContent =
      `${stats.dental_income?.amount ?? 0} / ${stats.dental_income?.count ?? 0}`;

  if (get("dental_opd_stat"))
    get("dental_opd_stat").textContent =
      `${stats.dental_opd?.amount ?? 0} / ${stats.dental_opd?.count ?? 0}`;

  if (get("physio_bill_stat"))
    get("physio_bill_stat").textContent =
      `${stats.physiotherapy_bill?.amount ?? 0} / ${stats.physiotherapy_bill?.count ?? 0}`;

  if (get("physio_opd_stat"))
    get("physio_opd_stat").textContent =
      `${stats.physiotherpay_opd?.amount ?? 0} / ${stats.physiotherpay_opd?.count ?? 0}`;
}

function renderEmptyCharts() {
  // Chart.js charts (existing)
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

  // ApexCharts: initialize empty traffic chart (bar + line)
  // Ensure ApexCharts script is loaded in HTML before this script runs.
  trafficChart = new ApexCharts(
    document.querySelector("#traffic_sources_chart"),
    {
      series: [
        { name: 'Doctor Income', type: 'column', data: [] },
        { name: 'Patients', type: 'line', data: [] }
      ],
      chart: { height: 330, type: 'line', stacked: false },
      stroke: { width: [0, 3] },
      plotOptions: { bar: { columnWidth: "55%" } },
      colors: ["#2196F3", "#00E676"],
      labels: [],
      yaxis: [
        { title: { text: "Income (Tk)" } },
        { opposite: true, title: { text: "Patients" } }
      ],
      legend: { position: 'bottom' }
    }
  );
  trafficChart.render();

  // ApexCharts: initialize empty income donut chart
  incomeDonutChart = new ApexCharts(
    document.querySelector("#income_progress_chart"),
    {
      chart: { type: "radialBar", height: 330 },
      series: [0],
      colors: ["#2196F3"],
      plotOptions: {
        radialBar: {
          hollow: { size: "65%" },
          dataLabels: {
            name: { show: false },
            value: {
              fontSize: "32px",
              show: true,
              formatter: val => `${val}%`
            }
          }
        }
      },
      labels: ["Income"]
    }
  );
  incomeDonutChart.render();
}

// =====================
//   UPDATE STATS + TABLE
// =====================
function updateStatsAndTable(resp) {
  const records = resp.records || [];
  const total = records.reduce((s, r) => s + Number(r.value || 0), 0);

  const elStatCount = document.getElementById('statCount');
  const elStatSum = document.getElementById('statSum');
  const elStatAvg = document.getElementById('statAvg');
  const elStatCats = document.getElementById('statCats');

  if (elStatCount) elStatCount.innerText = records.length;
  if (elStatSum) elStatSum.innerText = formatNumber(total);
  if (elStatAvg) elStatAvg.innerText =
    records.length ? formatNumber(total / records.length) : '—';
  if (elStatCats) elStatCats.innerText = (resp.categories || []).length;

  const tbody = document.getElementById('recordsTbody');
  if (!tbody) return;
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
  const q = document.getElementById('searchInput')?.value?.trim() || '';
  const fromVal = document.getElementById('fromInput')?.value || '';
  const toVal = document.getElementById('toInput')?.value || '';

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (fromVal) params.set('from', fromVal);
  if (toVal) params.set('to', toVal);

  fetch('/api/data?' + params.toString())
    .then(r => {
      if (!r.ok) throw new Error("Network response was not ok");
      return r.json();
    })
    .then(resp => {

      const stats = resp.stats || {};

      // 1) Update financial stats cards (amount / count)
      updateFinancialStats(stats);

      // 2) Chart.js timeseries line
      const ts = resp.timeseries || [];
      const labels = ts.map(x => x.date);
      const data = ts.map(x => x.total);

      if (lineChart) {
        lineChart.data.labels = labels;
        lineChart.data.datasets = [{ label: 'Total', data: data, fill: true }];
        lineChart.update();
      }

      // 3) Chart.js categories bar
      const cats = resp.categories || [];
      if (barChart) {
        barChart.data.labels = cats.map(x => x.category);
        barChart.data.datasets = [{ label: 'Sum', data: cats.map(x => x.total) }];
        barChart.update();
      }

      // 4) Chart.js doughnut (top labels)
      const top = resp.top_labels || [];
      if (doughnutChart) {
        doughnutChart.data.labels = top.map(x => x.label);
        doughnutChart.data.datasets = [{ data: top.map(x => x.total) }];
        doughnutChart.update();
      }

      // 5) ApexCharts: trafficChart and incomeDonutChart from stats.doctor_total_income
      const docs = stats.doctor_total_income || [];

      if (trafficChart) {
        if (docs.length) {
          const labels = docs.map(d => d.doctor_name);
          const incomes = docs.map(d => Number(d.income || 0));
          const counts = docs.map(d => Number(d.count || 0));

          // update labels & series
          trafficChart.updateOptions({
            labels: labels
          });

          trafficChart.updateSeries([
            { name: 'Doctor Income', type: 'column', data: incomes },
            { name: 'Patients', type: 'line', data: counts }
          ]);
        } else {
          // clear if no docs
          trafficChart.updateOptions({ labels: [] });
          trafficChart.updateSeries([
            { name: 'Doctor Income', type: 'column', data: [] },
            { name: 'Patients', type: 'line', data: [] }
          ]);
        }
      }

      if (incomeDonutChart) {
        if (docs.length) {
          const incomes = docs.map(d => Number(d.income || 0));
          const totalIncome = incomes.reduce((a, b) => a + b, 0);
          const maxIncome = incomes.length ? Math.max(...incomes) : 1;
          const target = maxIncome * 2 || 1; // as requested: highest * 2
          let percent = Math.round((totalIncome / target) * 100);
          // bound percent 0..100
          percent = Math.max(0, Math.min(100, percent));
          incomeDonutChart.updateSeries([percent]);
        } else {
          incomeDonutChart.updateSeries([0]);
        }
      }

      // 6) Chart.js stacked chart (same logic as before)
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
        if ((d in dayIndex) && (r.category in catIndex)) {
          dataGrid[catIndex[r.category]][dayIndex[d]] += Number(r.value || 0);
        }
      });

      if (stackedChart) {
        stackedChart.data.labels = daySet;
        stackedChart.data.datasets = catSet.map((cat, idx) => ({
          label: cat,
          data: dataGrid[idx]
        }));
        stackedChart.update();
      }

      // 7) Update table and other stats
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

  const searchEl = document.getElementById('searchInput');
  if (searchEl) {
    searchEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') fetchDataAndUpdate();
    });
  }
});
