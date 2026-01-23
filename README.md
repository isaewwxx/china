# China Overcapacity Analysis

Neutral, data-driven website explaining China’s industrial overcapacity and its global economic implications.

## Preview

Run a local server and open in browser:

```bash
cd /workspaces/china
python3 -m http.server 8000
```

Then visit http://localhost:8000

## Live Data

The site uses World Bank WDI API for key proxies:

- CHN `NV.IND.MANF.CD` — Manufacturing value added (capacity proxy)
- WLD `NE.CON.TOTL.CD` — Global consumption (demand proxy)
- CHN `EN.ATM.CO2E.KT` — CO₂ emissions
- CHN `NE.EXP.GNFS.CD` — Exports (goods & services)
- CHN `TX.UVI.MRCH.XD.WD` — Export unit value index (price proxy)
- CHN `SL.IND.EMPL.ZS` — Industry employment share

Regional aggregates (e.g., EUU, NAC, EAS, LAC, SSF) are used for comparative charts.

## Design & Accessibility

- Clean, modern palette (white, dark blue, muted red accents)
- D3 charts with gridlines, area fills, and hover tooltips
- Chart.js configured for consistent legends and colors
- Semantic HTML and ARIA labels for chart containers