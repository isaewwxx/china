const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        color: "#0b1a2b",
        usePointStyle: true,
        boxWidth: 10,
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor: "#0b1a2b",
      titleColor: "#ffffff",
      bodyColor: "#ffffff",
    },
  },
  scales: {
    x: {
      ticks: { color: "#475569" },
      grid: { color: "#e3e7ee" },
    },
    y: {
      ticks: { color: "#475569" },
      grid: { color: "#e3e7ee" },
    },
  },
};

const WB_BASE = "https://api.worldbank.org/v2";
const metricList = document.getElementById("metricList");
const applyFilters = document.getElementById("applyFilters");
const downloadData = document.getElementById("downloadData");

// Unified palette
const palette = {
  blue: "#1c4d8c",
  red: "#b74c4c",
  gray: "#475569",
  grid: "#e3e7ee",
};

// Chart.js theme defaults
if (window.Chart) {
  Chart.defaults.color = palette.gray;
  Chart.defaults.font.family = "Inter, Segoe UI, system-ui, sans-serif";
  Chart.defaults.plugins.legend.position = "bottom";
}

const dataStore = {
  capacity: [],
  demand: [],
  emissions: [],
  exports: [],
  exportPrices: [],
  employment: [],
  capacityIndex: [],
  demandIndex: [],
  productionIndex: [],
  emissionIndex: [],
};

const formatNumber = (value, digits = 0) =>
  new Intl.NumberFormat("bg-BG", {
    maximumFractionDigits: digits,
  }).format(value);

const formatUSD = (value) => {
  if (value >= 1e12) return `${formatNumber(value / 1e12, 2)} трлн. USD`;
  if (value >= 1e9) return `${formatNumber(value / 1e9, 2)} млрд. USD`;
  if (value >= 1e6) return `${formatNumber(value / 1e6, 2)} млн. USD`;
  return `${formatNumber(value)} USD`;
};

const fetchWbSeries = async (country, indicator, start = 2000, end = 2024) => {
  const url = `${WB_BASE}/country/${country}/indicator/${indicator}?format=json&per_page=20000`;
  const response = await d3.json(url);
  if (!Array.isArray(response) || !response[1]) return [];
  return response[1]
    .filter((item) => item && item.value !== null)
    .map((item) => ({ year: Number(item.date), value: Number(item.value) }))
    .filter((item) => item.year >= start && item.year <= end)
    .sort((a, b) => a.year - b.year);
};

const normalizeSeries = (series, baseYear) => {
  const baseItem = series.find((item) => item.year === baseYear) || series[0];
  if (!baseItem) return [];
  return series.map((item) => ({
    year: item.year,
    value: (item.value / baseItem.value) * 100,
  }));
};

const alignSeries = (seriesA, seriesB) => {
  const years = seriesA
    .map((item) => item.year)
    .filter((year) => seriesB.some((item) => item.year === year));
  const alignedA = seriesA.filter((item) => years.includes(item.year));
  const alignedB = seriesB.filter((item) => years.includes(item.year));
  return { years, alignedA, alignedB };
};

const renderLineChart = (selector, series, { yLabel } = {}) => {
  const svg = d3.select(selector);
  if (svg.empty()) return;
  svg.selectAll("*").remove();

  const width = svg.node().clientWidth || 720;
  const height = 280;
  const margin = { top: 20, right: 20, bottom: 30, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  svg.attr("viewBox", `0 0 ${width} ${height}`);

  const allPoints = series.flatMap((item) => item.data);
  const x = d3
    .scaleLinear()
    .domain(d3.extent(allPoints, (d) => d.year))
    .range([0, innerWidth]);
  const y = d3
    .scaleLinear()
    .domain([
      d3.min(allPoints, (d) => d.value) * 0.95,
      d3.max(allPoints, (d) => d.value) * 1.05,
    ])
    .nice()
    .range([innerHeight, 0]);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Gridlines
  g.append("g")
    .attr("class", "d3-grid")
    .attr("transform", `translate(0,0)`) // y grid
    .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(() => ""));

  // Axes
  g.append("g")
    .attr("class", "d3-axis x-axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")));

  g.append("g").attr("class", "d3-axis y-axis").call(d3.axisLeft(y).ticks(5));

  if (yLabel) {
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -innerHeight / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#475569")
      .attr("font-size", "12px")
      .text(yLabel);
  }

  const colorAlpha = (hex, alpha) => {
    // convert hex to rgba string
    const h = hex.replace("#", "");
    const bigint = parseInt(h, 16);
    const r = (bigint >> 16) & 255;
    const gC = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${gC}, ${b}, ${alpha})`;
  };

  const line = d3
    .line()
    .x((d) => x(d.year))
    .y((d) => y(d.value))
    .curve(d3.curveMonotoneX);

  const area = d3
    .area()
    .x((d) => x(d.year))
    .y0(() => y.range()[0])
    .y1((d) => y(d.value))
    .curve(d3.curveMonotoneX);

  series.forEach((item) => {
    // area fill for readability
    g.append("path")
      .datum(item.data)
      .attr("fill", colorAlpha(item.color, 0.15))
      .attr("d", area);

    g.append("path")
      .datum(item.data)
      .attr("fill", "none")
      .attr("stroke", item.color)
      .attr("stroke-width", 2.6)
      .attr("d", line);
  });

  const legend = svg
    .append("g")
    .attr("transform", `translate(${margin.left + 8},${margin.top})`);

  series.forEach((item, index) => {
    const legendRow = legend.append("g").attr("transform", `translate(0,${index * 18})`);
    legendRow
      .append("rect")
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", item.color)
      .attr("rx", 2);
    legendRow
      .append("text")
      .attr("x", 16)
      .attr("y", 9)
      .attr("font-size", "12px")
      .attr("fill", "#475569")
      .text(item.label);
  });

  // Tooltip/focus
  const bisect = d3.bisector((d) => d.year).left;
  const focus = g.append("g").style("display", "none");
  focus.append("circle").attr("r", 4).attr("fill", palette.blue).attr("stroke", "#fff").attr("stroke-width", 2);
  const tooltip = g.append("g").style("display", "none");
  tooltip
    .append("rect")
    .attr("width", 160)
    .attr("height", 48)
    .attr("fill", "#0b1a2b")
    .attr("rx", 6)
    .attr("opacity", 0.95);
  const t1 = tooltip
    .append("text")
    .attr("x", 8)
    .attr("y", 18)
    .attr("fill", "#ffffff")
    .attr("font-size", "12px");
  const t2 = tooltip
    .append("text")
    .attr("x", 8)
    .attr("y", 34)
    .attr("fill", "#ffffff")
    .attr("font-size", "12px");

  const overlay = g
    .append("rect")
    .attr("class", "overlay")
    .attr("fill", "transparent")
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .on("mousemove", function (event) {
      const [mx] = d3.pointer(event, this);
      const xYear = Math.round(x.invert(mx));
      const s0 = series[0].data;
      const i = Math.max(0, Math.min(s0.length - 1, bisect(s0, xYear)));
      const d0 = s0[i];
      if (!d0) return;
      const cx = x(d0.year);
      const cy = y(d0.value);
      focus.style("display", null).attr("transform", `translate(${cx},${cy})`);
      tooltip.style("display", null).attr("transform", `translate(${cx + 12},${cy - 24})`);

      const sA = series[0].data.find((p) => p.year === d0.year);
      const sB = series[1]?.data.find((p) => p.year === d0.year);
      t1.text(`${series[0].label}: ${sA ? sA.value.toFixed(1) : "-"}`);
      t2.text(`${series[1]?.label || ""}: ${sB ? sB.value.toFixed(1) : "-"}`);
    })
    .on("mouseleave", () => {
      focus.style("display", "none");
      tooltip.style("display", "none");
    });
};

const initStaticCharts = () => {
  const subsidyCtx = document.getElementById("subsidyChart");
  if (subsidyCtx) {
    new Chart(subsidyCtx, {
      type: "bar",
      data: {
        labels: ["Стомана", "Електромобили", "Батерии", "Соларни", "Електроника"],
        datasets: [
          {
            label: "Оценка на субсидии (млрд. USD)",
            data: [22, 18, 15, 14, 10],
            backgroundColor: ["#1c4d8c", "#224d7a", "#2e5e99", "#4873b0", "#6d8ec1"],
          },
        ],
      },
      options: chartDefaults,
    });
  }

  const financeCtx = document.getElementById("financeChart");
  if (financeCtx) {
    const isNarrow = window.innerWidth < 720;
    new Chart(financeCtx, {
      type: "doughnut",
      data: {
        labels: ["Държавни банки", "Местни власти", "Частен капитал", "Пазари"],
        datasets: [
          {
            data: [45, 25, 15, 15],
            backgroundColor: ["#123155", "#1c4d8c", "#6d8ec1", "#d88c8c"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        layout: { padding: 10 },
        plugins: {
          legend: {
            position: isNarrow ? "bottom" : "right",
            align: "center",
            labels: {
              color: "#0b1a2b",
              usePointStyle: true,
              boxWidth: 10,
              padding: 14,
            },
          },
        },
      },
    });
  }

  const wasteCtx = document.getElementById("wasteChart");
  if (wasteCtx) {
    new Chart(wasteCtx, {
      type: "bar",
      data: {
        labels: ["2010", "2015", "2020", "2023"],
        datasets: [
          {
            label: "Непродадена продукция (млн. тона) – индикативно",
            data: [12, 18, 25, 30],
            backgroundColor: "#6d8ec1",
          },
        ],
      },
      options: chartDefaults,
    });
  }
};

const buildPriceExportChart = (labels, priceSeries, exportSeries) => {
  const priceExportCtx = document.getElementById("priceExportChart");
  if (!priceExportCtx) return;

  new Chart(priceExportCtx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Експортни ценови индекси (прокси)",
          data: priceSeries,
          borderColor: "#b74c4c",
          tension: 0.3,
        },
        {
          label: "Износ (индекс)",
          data: exportSeries,
          borderColor: "#1c4d8c",
          tension: 0.3,
        },
      ],
    },
    options: chartDefaults,
  });
};

const buildScatterChart = (dataPoints) => {
  const factoryClosureCtx = document.getElementById("factoryClosureChart");
  if (!factoryClosureCtx) return;

  new Chart(factoryClosureCtx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Износ vs заетост в индустрията (прокси)",
          data: dataPoints,
          backgroundColor: "#1c4d8c",
        },
      ],
    },
    options: {
      ...chartDefaults,
      scales: {
        x: { title: { display: true, text: "Износ (индекс)" }, ticks: { color: "#475569" } },
        y: { title: { display: true, text: "Заетост в индустрията (%)" }, ticks: { color: "#475569" } },
      },
    },
  });
};

const buildRegionalImpactChart = (labels, manufShare, employmentShare) => {
  const regionalImpactCtx = document.getElementById("regionalImpactChart");
  if (!regionalImpactCtx) return;

  new Chart(regionalImpactCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Производство (% от БВП)",
          data: manufShare,
          backgroundColor: "rgba(28, 77, 140, 0.7)",
        },
        {
          label: "Заетост в индустрията (% от обща)",
          data: employmentShare,
          backgroundColor: "rgba(183, 76, 76, 0.7)",
        },
      ],
    },
    options: chartDefaults,
  });
};

const updateMetricList = () => {
  if (!metricList || dataStore.capacity.length === 0) return;

  const latestCapacity = dataStore.capacity[dataStore.capacity.length - 1];
  const latestDemand = dataStore.demand[dataStore.demand.length - 1];
  const latestEmissions = dataStore.emissions[dataStore.emissions.length - 1];
  const latestExports = dataStore.exports[dataStore.exports.length - 1];

  metricList.innerHTML = [
    `Последна година: ${latestCapacity?.year || ""}`,
    `Производство (VA): ${formatUSD(latestCapacity?.value || 0)}`,
    `Глобално търсене (proxy): ${formatUSD(latestDemand?.value || 0)}`,
    `Емисии CO₂: ${formatNumber((latestEmissions?.value || 0) / 1000, 1)} Mt`,
    `Износ: ${formatUSD(latestExports?.value || 0)}`,
  ]
    .map((item) => `<li>${item}</li>`)
    .join("");
};

const init = async () => {
  initStaticCharts();

  const [
    manufacturingChina,
    globalDemand,
    emissionsChina,
    exportsChina,
    exportUnitValue,
    employmentIndustryChina,
  ] = await Promise.all([
    fetchWbSeries("CHN", "NV.IND.MANF.CD"),
    fetchWbSeries("WLD", "NE.CON.TOTL.CD"),
    fetchWbSeries("CHN", "EN.ATM.CO2E.KT"),
    fetchWbSeries("CHN", "NE.EXP.GNFS.CD"),
    fetchWbSeries("CHN", "TX.UVI.MRCH.XD.WD"),
    fetchWbSeries("CHN", "SL.IND.EMPL.ZS"),
  ]);

  dataStore.capacity = manufacturingChina;
  dataStore.demand = globalDemand;
  dataStore.emissions = emissionsChina;
  dataStore.exports = exportsChina;
  dataStore.exportPrices = exportUnitValue;
  dataStore.employment = employmentIndustryChina;

  if (manufacturingChina.length && globalDemand.length) {
    const { alignedA, alignedB } = alignSeries(manufacturingChina, globalDemand);
    const baseYear = alignedA[0]?.year;
    const capacityIndex = normalizeSeries(alignedA, baseYear);
    const demandIndex = normalizeSeries(alignedB, baseYear);

    dataStore.capacityIndex = capacityIndex;
    dataStore.demandIndex = demandIndex;
    renderLineChart("#capacityChart", [
      { label: "Производствен капацитет (proxy)", data: capacityIndex, color: "#1c4d8c" },
      { label: "Глобално търсене (proxy)", data: demandIndex, color: "#b74c4c" },
    ], { yLabel: "Индекс (" + baseYear + "=100)" });
  }

  if (manufacturingChina.length && emissionsChina.length) {
    const { alignedA, alignedB } = alignSeries(manufacturingChina, emissionsChina);
    const baseYear = alignedA[0]?.year;
    const productionIndex = normalizeSeries(alignedA, baseYear);
    const emissionIndex = normalizeSeries(alignedB, baseYear);

    dataStore.productionIndex = productionIndex;
    dataStore.emissionIndex = emissionIndex;
    renderLineChart("#emissionsChart", [
      { label: "Производство (proxy)", data: productionIndex, color: "#1c4d8c" },
      { label: "Емисии CO₂", data: emissionIndex, color: "#b74c4c" },
    ], { yLabel: "Индекс (" + baseYear + "=100)" });
  }

  if (exportsChina.length && (exportUnitValue.length || manufacturingChina.length)) {
    const priceSeriesSource = exportUnitValue.length ? exportUnitValue : manufacturingChina;
    const { alignedA, alignedB } = alignSeries(priceSeriesSource, exportsChina);
    const baseYear = alignedA[0]?.year;
    const priceIndex = normalizeSeries(alignedA, baseYear);
    const exportIndex = normalizeSeries(alignedB, baseYear);

    buildPriceExportChart(
      alignedA.map((item) => item.year.toString()),
      priceIndex.map((item) => item.value),
      exportIndex.map((item) => item.value)
    );
  }

  if (exportsChina.length && employmentIndustryChina.length) {
    const { alignedA, alignedB } = alignSeries(exportsChina, employmentIndustryChina);
    const baseYear = alignedA[0]?.year;
    const exportIndex = normalizeSeries(alignedA, baseYear);
    const scatterData = exportIndex.map((item, index) => ({
      x: Number(item.value.toFixed(1)),
      y: Number(alignedB[index].value.toFixed(2)),
    }));
    buildScatterChart(scatterData);
  }

  const regionMap = [
    { code: "EUU", label: "ЕС" },
    { code: "NAC", label: "Северна Америка" },
    { code: "EAS", label: "Азия" },
    { code: "LAC", label: "Латинска Америка" },
    { code: "SSF", label: "Африка" },
  ];

  const manufShares = await Promise.all(
    regionMap.map((region) => fetchWbSeries(region.code, "NV.IND.MANF.ZS"))
  );
  const employmentShares = await Promise.all(
    regionMap.map((region) => fetchWbSeries(region.code, "SL.IND.EMPL.ZS"))
  );

  const latestManuf = manufShares.map((series) => series.at(-1)?.value || 0);
  const latestEmploy = employmentShares.map((series) => series.at(-1)?.value || 0);

  buildRegionalImpactChart(
    regionMap.map((region) => region.label),
    latestManuf,
    latestEmploy
  );

  updateMetricList();
};

const debounce = (fn, wait = 150) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

const redrawCharts = debounce(() => {
  if (dataStore.capacityIndex.length && dataStore.demandIndex.length) {
    const baseYear = dataStore.capacityIndex[0]?.year;
    renderLineChart("#capacityChart", [
      { label: "Производствен капацитет (proxy)", data: dataStore.capacityIndex, color: palette.blue },
      { label: "Глобално търсене (proxy)", data: dataStore.demandIndex, color: palette.red },
    ], { yLabel: "Индекс (" + baseYear + "=100)" });
  }
  if (dataStore.productionIndex.length && dataStore.emissionIndex.length) {
    const baseYear = dataStore.productionIndex[0]?.year;
    renderLineChart("#emissionsChart", [
      { label: "Производство (proxy)", data: dataStore.productionIndex, color: palette.blue },
      { label: "Емисии CO₂", data: dataStore.emissionIndex, color: palette.red },
    ], { yLabel: "Индекс (" + baseYear + "=100)" });
  }
}, 200);

window.addEventListener("resize", redrawCharts);

if (applyFilters && metricList) {
  applyFilters.addEventListener("click", () => {
    const year = Number(document.getElementById("yearFilter").value);
    const industry = document.getElementById("industryFilter").value;
    const region = document.getElementById("regionFilter").value;

    const latestExports = dataStore.exports.find((item) => item.year === year);
    const latestEmissions = dataStore.emissions.find((item) => item.year === year);

    const industryLabel = {
      steel: "Стомана",
      ev: "Електромобили",
      solar: "Соларни панели",
      electronics: "Електроника",
    };

    const regionText = {
      global: "Глобално",
      eu: "ЕС",
      na: "Северна Америка",
      asia: "Азия",
    };

    metricList.innerHTML = [
      `Година: ${year}`,
      `Регион: ${regionText[region] || "Глобално"}`,
      `Индустрия: ${industryLabel[industry] || "Стомана"}`,
      `Износ: ${formatUSD(latestExports?.value || 0)}`,
      `Емисии CO₂: ${formatNumber((latestEmissions?.value || 0) / 1000, 1)} Mt`,
    ]
      .map((item) => `<li>${item}</li>`)
      .join("");
  });
}

if (downloadData) {
  downloadData.addEventListener("click", () => {
    const rows = [
      ["Year", "Manufacturing_VA_USD", "Global_Consumption_USD", "CO2_kt", "Exports_USD"],
    ];

    dataStore.capacity.forEach((item) => {
      const demand = dataStore.demand.find((row) => row.year === item.year);
      const emissions = dataStore.emissions.find((row) => row.year === item.year);
      const exports = dataStore.exports.find((row) => row.year === item.year);
      rows.push([
        item.year,
        item.value,
        demand?.value ?? "",
        emissions?.value ?? "",
        exports?.value ?? "",
      ]);
    });

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "worldbank-china-overcapacity-data.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

init();
