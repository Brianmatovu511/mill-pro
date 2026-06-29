import { useState, useEffect } from 'react';
import { dashboardAPI, batchesAPI, salesAPI } from '../api';

// Colours mirrored from App.jsx's T object
const C = {
  card: '#FFFFFF', p: '#BF8C1A', pL: '#FDF3DC',
  g:    '#247529', gL: '#E3F5E4', r: '#B71C1C', rL: '#FFEBEE',
  bl:   '#1255A0', ac: '#C74B1A', txt:'#151A15',
  t2:   '#5E6E5E', t3: '#98A698', brd:'#DED8CC', inp:'#F2ECE2',
};
const FH  = "'Playfair Display',serif";
const fmt = n  => new Intl.NumberFormat('en-UG').format(Math.round(n || 0));
const td  = () => new Date().toISOString().split('T')[0];

// ── Local UI primitives (match App.jsx style) ────────────────────────────────
const Card = ({ children, style }) => (
  <div style={{
    background: C.card, borderRadius: 14, padding: 20,
    boxShadow: '0 1px 4px rgba(0,0,0,.04)',
    border: `1px solid ${C.brd}`, ...style,
  }}>
    {children}
  </div>
);

const MiniStat = ({ label, value, color = C.p, sub }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <span style={{
      fontSize: 10, fontWeight: 700, color: C.t2,
      textTransform: 'uppercase', letterSpacing: 0.8,
    }}>{label}</span>
    <span style={{
      fontSize: 20, fontWeight: 800, fontFamily: FH, color, lineHeight: 1.2,
    }}>{value}</span>
    {sub && <span style={{ fontSize: 11, color: C.t3 }}>{sub}</span>}
  </div>
);

const ProgressBar = ({ value, max, color = C.g }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 8, borderRadius: 6, background: C.inp, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${pct}%`, borderRadius: 6,
        background: `linear-gradient(90deg, ${color}99, ${color})`,
        transition: 'width .6s cubic-bezier(.4,0,.2,1)',
      }} />
    </div>
  );
};

const StockRow = ({ label, kg, target, color }) => (
  <div>
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      fontSize: 12, color: C.t2, marginBottom: 4,
    }}>
      <span>{label}</span>
      <span style={{ fontWeight: 700, color }}>{fmt(kg)} kg</span>
    </div>
    <ProgressBar value={kg} max={target} color={color} />
  </div>
);

// ── Widget ───────────────────────────────────────────────────────────────────
export default function DailySummaryWidget({ cur = 'UGX' }) {
  const [dash,    setDash]    = useState(null);
  const [batches, setBatches] = useState([]);
  const [sales,   setSales]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    const today = td();
    Promise.all([
      dashboardAPI.get(),
      batchesAPI.list({ from: today, to: today }),
      salesAPI.list(),
    ])
      .then(([d, b, s]) => {
        setDash(d.data);
        setBatches(b.data || []);
        // salesAPI has no date param — filter client-side
        setSales((s.data || []).filter(x => x.date?.startsWith(today)));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Card>
      <div style={{
        height: 120, display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: C.t3, fontSize: 13,
      }}>
        Loading today's summary…
      </div>
    </Card>
  );

  if (error) return (
    <Card>
      <div style={{
        height: 80, display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: C.r, fontSize: 13,
      }}>
        Could not load daily summary.
      </div>
    </Card>
  );

  // Derived numbers
  const todayMaize   = batches.reduce((s, b) => s + (b.maizeIn  || 0), 0);
  const todayFlour   = batches.reduce((s, b) => s + (b.flourOut || 0), 0);
  const todayRevenue = sales.reduce((s, x)   => s + (x.total    || 0), 0);
  const todayYield   = todayMaize > 0
    ? ((todayFlour / todayMaize) * 100).toFixed(1)
    : null;

  const flourStock = dash?.inventory?.FLOUR     || 0;
  const maizeStock = dash?.inventory?.RAW_MAIZE || 0;
  const branStock  = dash?.inventory?.BRAN      || 0;
  const STOCK_MAX  = 1000; // visual scale reference in kg

  const yieldColor =
    todayYield === null ? C.t3 :
    todayYield >= 75   ? C.g  :
    todayYield >= 60   ? C.p  : C.r;

  const dateLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'short',
  });

  return (
    <Card>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 18,
      }}>
        <h3 style={{ fontFamily: FH, fontSize: 16, fontWeight: 700, color: C.txt }}>
          Today's Activity
        </h3>
        <span style={{ fontSize: 11, color: C.t3 }}>{dateLabel}</span>
      </div>

      {/* ── Key numbers ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
        gap: 16, marginBottom: 20,
      }}>
        <MiniStat
          label="Batches Run"
          value={batches.length}
          color={C.bl}
          sub={batches.length === 0 ? 'none yet' : undefined}
        />
        <MiniStat
          label="Maize In"
          value={`${fmt(todayMaize)} kg`}
          color={C.p}
        />
        <MiniStat
          label="Flour Out"
          value={`${fmt(todayFlour)} kg`}
          color={C.g}
        />
        <MiniStat
          label="Sales Revenue"
          value={`${cur} ${fmt(todayRevenue)}`}
          color={C.ac}
          sub={`${sales.length} sale${sales.length !== 1 ? 's' : ''}`}
        />
      </div>

      {/* ── Yield efficiency bar ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 6,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.t2 }}>
            Flour Yield (today)
          </span>
          <span style={{ fontSize: 13, fontWeight: 800, color: yieldColor }}>
            {todayYield !== null ? `${todayYield}%` : 'No batches yet'}
          </span>
        </div>
        <ProgressBar
          value={parseFloat(todayYield) || 0}
          max={100}
          color={yieldColor}
        />
        {todayYield !== null && (
          <p style={{ fontSize: 11, color: C.t3, marginTop: 5 }}>
            {todayYield >= 75
              ? '✓ Good efficiency for today'
              : todayYield >= 60
              ? 'Yield is acceptable — monitor closely'
              : '⚠ Yield is below target — check machine settings'}
          </p>
        )}
      </div>

      {/* ── Stock levels ── */}
      <div style={{ borderTop: `1px solid ${C.brd}`, paddingTop: 14 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: C.t2,
          textTransform: 'uppercase', letterSpacing: 0.8,
        }}>
          Current Stock Levels
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          <StockRow
            label="Flour"
            kg={flourStock}
            target={STOCK_MAX}
            color={flourStock < 100 ? C.r : C.g}
          />
          <StockRow
            label="Raw Maize"
            kg={maizeStock}
            target={STOCK_MAX}
            color={maizeStock < 100 ? C.r : C.p}
          />
          <StockRow
            label="Bran"
            kg={branStock}
            target={STOCK_MAX}
            color={C.bl}
          />
        </div>
      </div>

      {/* ── Low stock warning ── */}
      {(flourStock < 100 || maizeStock < 100) && (
        <div style={{
          marginTop: 14, padding: '9px 13px', borderRadius: 8,
          background: C.rL, fontSize: 12, color: C.r, fontWeight: 600,
        }}>
          ⚠ Stock running low —{flourStock < 100 ? ' Flour' : ''}{maizeStock < 100 ? ' Raw Maize' : ''}{' '}needs restocking
        </div>
      )}
    </Card>
  );
}