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
      `${stats.physiotherapy_opd?.amount ?? 0} / ${stats.physiotherapy_opd?.count ?? 0}`;

   if (get("optics_sale_stat"))
    get("optics_sale_stat").textContent =
      `${stats.optics_income?.amount ?? 0} / ${stats.optics_income?.count ?? 0} / ${stats.optics_income?.paid ?? 0}`;

  if (get("noofsurgery_stat"))
    get("noofsurgery_stat").textContent =
      `${stats.surgery?.count ?? 0}`;

  if (get("admission_income_stat"))
    get("admission_income_stat").textContent =
      `${stats.admission?.amount ?? 0} / ${stats.admission?.count ?? 0}`;

  if (get("investigation_income_stat"))
    get("investigation_income_stat").textContent =
      `${stats.investigation_income?.amount ?? 0} / ${stats.investigation_income?.count ?? 0}`;

  if (get("pos_income_stat"))
    get("pos_income_stat").textContent =
      `${stats.pos_income?.subtotal ?? 0} / ${stats.pos_income?.count ?? 0}`;

  if (get("cash_abo_stat"))
    get("cash_abo_stat").textContent =
      `${stats.money_receipt?.amount ?? 0}`;

  if (get("discount_stat"))
    get("discount_stat").textContent =
    `${stats.discount?.total_discount ?? 0} / ${stats.discount?.count ?? 0}`;

    // income of general

  
  if (get("pathology_income_stat"))
    get("pathology_income_stat").textContent =
    `${stats.pathology_income?.amount ?? 0} / ${stats.pathology_income?.count ?? 0}`;


  if (get("mri_income_stat"))
    get("mri_income_stat").textContent =
    `${stats.MRI_income?.amount ?? 0} / ${stats.MRI_income?.count ?? 0}`;


  if (get("ct_income_stat"))
    get("ct_income_stat").textContent =
    `${stats.ct_scan_income?.amount ?? 0} / ${stats.ct_scan_income?.count ?? 0}`;


  if (get("xray_income_stat"))
    get("xray_income_stat").textContent =
    `${stats.x_ray_income?.amount ?? 0} / ${stats.x_ray_income?.count ?? 0}`;

  if (get("usg_echo_income_stat"))
    get("usg_echo_income_stat").textContent =
    `${stats.usg_echo_income?.amount ?? 0} / ${stats.usg_echo_income?.count ?? 0}`;

  if (get("ecg_income_stat"))
    get("ecg_income_stat").textContent =
    `${stats.ecg_income?.amount ?? 0} / ${stats.ecg_income?.count ?? 0}`;


  if (get("indoor_income_stat"))
    get("indoor_income_stat").textContent =
    `${stats.indoor_patient?.count ?? 0} / ${stats.indoor_patient?.paid ?? 0}/${stats.indoor_patient?.total_admission ?? 0} `;

  if (get("pharmacy_income_stat"))
    get("pharmacy_income_stat").textContent =
    `${stats.general_pos_income?.subtotal ?? 0} / ${stats.general_pos_income?.count ?? 0}`;


  if (get("indoor_pharmacy_stat"))
    get("indoor_pharmacy_stat").textContent =
    `${stats.indoor_pos_income?.in_pos_income ?? 0} / ${stats.indoor_pos_income?.in_pos_count ?? 0}`;

  if (get("cash_income_stat"))
    get("cash_income_stat").textContent =
    `${stats.legh_money_receipt?.amount ?? 0} / ${stats.legh_money_receipt?.count ?? 0}`;

// fetching blf stat 
  if (get("blf_cash_stat"))
    get("blf_cash_stat").textContent =
    `${stats.blf_money_receipt?.amount ?? 0} / ${stats.blf_money_receipt?.count ?? 0}`;

  
  const total_cash=
    Number(stats.opd_income?.amount ?? 0) +
    Number(stats.pos_income?.subtotal ?? 0) +
    Number(stats.money_receipt?.amount ?? 0);


  
  if (get("total_cash_stat"))
    get("total_cash_stat").textContent = total_cash;



  const total_general_cash=
    Number(stats.general_pos_income?.subtotal ?? 0) +
    Number(stats.legh_money_receipt?.amount ?? 0);
  
  if (get("total_general_cash_stat"))
    get("total_general_cash_stat").textContent = total_general_cash;

    
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

      const tableBody = document.getElementById("doctorTableBody");
      if (tableBody) tableBody.innerHTML = "";

      loadDoctorTable("eye", stats);

      document.getElementById("departmentSelect").addEventListener("change", function () {
    loadDoctorTable(this.value, stats);
});

      // // Insert doctor rows
      // docs.forEach((doc, index) => {
      //     const row = document.createElement("tr");

      //     row.innerHTML = `
      //         <td>${index + 1}</td>
      //         <td>${doc.doctor_id}</td>
      //         <td>${doc.doctor_name}</td>
      //         <td contenteditable="true" data-field="income" data-index="${index}">
      //             ${doc.income}
      //         </td>
      //         <td contenteditable="true" data-field="count" data-index="${index}">
      //             ${doc.count}
      //         </td>
      //     `;

      //     tableBody.appendChild(row);
      // });

      // Enable live editing
      enableEditing(docs);



      


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

function enableEditing(doctors) {
    document.querySelectorAll("[contenteditable]").forEach(cell => {
        cell.addEventListener("input", function () {
            const index = this.getAttribute("data-index");
            const field = this.getAttribute("data-field");
            let value = this.innerText.trim();

            if (field === "income" || field === "count") {
                value = parseFloat(value) || 0;
            }

            doctors[index][field] = value;

            // Live-update charts
            // renderCharts(doctors);
        });
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

document.addEventListener("DOMContentLoaded", () => {

    const gradients = [
        "linear-gradient(135deg, #ff7eb3, #ff758c)",
        "linear-gradient(135deg, #6a11cb, #2575fc)",
        "linear-gradient(135deg, #ff9966, #ff5e62)",
        "linear-gradient(135deg, #00c6ff, #0072ff)",
        "linear-gradient(135deg, #f7971e, #ffd200)",
        "linear-gradient(135deg, #16a085, #f4d03f)",
        "linear-gradient(135deg, #ff5f6d, #ffc371)",
        "linear-gradient(135deg, #8360c3, #2ebf91)",
        "linear-gradient(135deg, #4e54c8, #8f94fb)",
        "linear-gradient(135deg, #11998e, #38ef7d)",
        "linear-gradient(135deg, #ff6a00, #ee0979)",
        "linear-gradient(135deg, #00b09b, #96c93d)",
        "linear-gradient(135deg, #1e3c72, #2a5298)",
        "linear-gradient(135deg, #d53369, #cbad6d)",
        "linear-gradient(135deg, #ffafbd, #ffc3a0)",
        "linear-gradient(135deg, #4568dc, #b06ab3)"
    ];

    const cards = document.querySelectorAll(".card.text-center");

    cards.forEach((card, index) => {
        card.style.background = gradients[index % gradients.length];
    });
});

function loadDoctorTable(department, stats) {

    const tableBody = document.getElementById("doctorTableBody");
    tableBody.innerHTML = "";

    let docs = [];

    // Mapping department → correct API key
    switch (department) {
        case "eye":
            docs = stats.doctor_total_income || [];
            break;
        case "dental":
            docs = stats.dental_doctor_income || [];
            break;
        case "physio":
            docs = stats.physiotherapist_income || [];
            break;
    }

    docs.forEach((doc, index) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${doc.doctor_id}</td>
            <td>${doc.doctor_name}</td>
            <td contenteditable="true" data-field="income" data-index="${index}">
                ${doc.income}
            </td>
            <td contenteditable="true" data-field="count" data-index="${index}">
                ${doc.count}
            </td>
            <td contenteditable="true" data-field="count" data-index="${index}">
                ${doc.investigation_income}
            </td>
        `;

        tableBody.appendChild(row);
    });
}


