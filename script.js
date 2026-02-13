const chartCanvas = document.getElementById('outputChart');

if (chartCanvas) {
  const labels = ['2018', '2019', '2020', '2021', '2022', '2023', '2024'];

  const demandData = [100, 104, 98, 108, 111, 114, 118];
  const outputData = [108, 116, 122, 133, 142, 154, 168];

  new Chart(chartCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Индекс на глобалното търсене',
          data: demandData,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.25)',
          borderWidth: 3,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.35,
          fill: false
        },
        {
          label: 'Индекс на производството в Китай',
          data: outputData,
          borderColor: '#ff2d2d',
          backgroundColor: 'rgba(255, 45, 45, 0.22)',
          borderWidth: 3,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.35,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: '#d8deea',
            font: {
              family: 'Inter'
            }
          }
        },
        tooltip: {
          backgroundColor: '#121212',
          titleColor: '#ffffff',
          bodyColor: '#d3daea',
          borderColor: 'rgba(255, 255, 255, 0.16)',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          ticks: { color: '#97a3b7' },
          grid: { color: 'rgba(255, 255, 255, 0.08)' }
        },
        y: {
          ticks: { color: '#97a3b7' },
          grid: { color: 'rgba(255, 255, 255, 0.08)' }
        }
      }
    }
  });
}

const revealItems = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.2
  }
);

revealItems.forEach((item) => revealObserver.observe(item));

window.addEventListener('load', () => {
  document.querySelector('.hero')?.classList.add('visible');
});
