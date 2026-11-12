export default function Loading() {
  return (
    <div className="lsx-loader" role="status" aria-label="Loading">
      <div className="lsx-card">
        <div className="lsx-ring">
          <span className="lsx-ring-spin" />
          <span className="lsx-ring-core" />
        </div>

        <p className="lsx-logo">
          linkstor<span>x</span>
        </p>

        <div className="lsx-bar">
          <i />
        </div>

        <p className="lsx-text">Loading your workspace</p>
      </div>

      <style>{`
        .lsx-loader {
          display: grid;
          place-items: center;
          min-height: 65vh;
          padding: 24px;
        }
        .lsx-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          animation: lsx-fade 0.35s ease both;
        }

        /* ring */
        .lsx-ring {
          position: relative;
          width: 64px;
          height: 64px;
        }
        .lsx-ring-spin {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: conic-gradient(from 0deg, #2563eb, #7c3aed, #22d3ee, transparent 75%);
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
                  mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
          animation: lsx-spin 0.9s linear infinite;
        }
        .lsx-ring-core {
          position: absolute;
          inset: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          box-shadow: 0 6px 18px rgba(37, 99, 235, 0.35);
          animation: lsx-pulse 1.4s ease-in-out infinite;
        }

        /* logo */
        .lsx-logo {
          margin: 4px 0 0;
          font-family: "Chewy", system-ui, sans-serif;
          font-size: 30px;
          line-height: 1;
          letter-spacing: 0.5px;
          color: #0f172a;
        }
        .lsx-logo span {
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          -webkit-background-clip: text;
                  background-clip: text;
          color: transparent;
        }

        /* progress bar */
        .lsx-bar {
          width: 140px;
          height: 4px;
          border-radius: 999px;
          background: #e5e7eb;
          overflow: hidden;
        }
        .lsx-bar i {
          display: block;
          width: 40%;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #2563eb, #7c3aed, #22d3ee);
          animation: lsx-slide 1.1s ease-in-out infinite;
        }

        .lsx-text {
          margin: 0;
          font-size: 12.5px;
          font-weight: 500;
          color: #94a3b8;
          letter-spacing: 0.3px;
        }

        @keyframes lsx-spin { to { transform: rotate(360deg); } }
        @keyframes lsx-pulse {
          0%, 100% { transform: scale(0.85); opacity: 0.85; }
          50% { transform: scale(1); opacity: 1; }
        }
        @keyframes lsx-slide {
          0% { transform: translateX(-110%); }
          100% { transform: translateX(260%); }
        }
        @keyframes lsx-fade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .lsx-ring-spin, .lsx-ring-core, .lsx-bar i { animation-duration: 3s; }
        }
      `}</style>
    </div>
  );
}