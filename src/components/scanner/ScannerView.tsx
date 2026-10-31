import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../ui/Icon';
import { ResultOverlay, type CheckinResult } from './ResultOverlay';

interface ScannerViewProps {
  eventId: string;
  staffName: string;
}

interface ScanHistoryItem {
  id: string;
  time: string;
  code: string;
  name: string;
  result: CheckinResult['result'];
}

export function ScannerView({ eventId, staffName }: ScannerViewProps) {
  const [stats, setStats] = useState<{ attended_count: number; paid_count: number; event_title: string }>({
    attended_count: 0,
    paid_count: 0,
    event_title: 'Happy Couple Class',
  });

  const [overlayData, setOverlayData] = useState<CheckinResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [manualCode, setManualCode] = useState('');
  const [loadingManual, setLoadingManual] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false);
  const lastScannedTokenRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  // 1. Fetch live event stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/qrclass/stats');
      if (res.ok) {
        const json = await res.json();
        setStats(json);
      }
    } catch (e) {
      // ignore network glitch
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // 2. Process checkin request
  const processCheckin = async (token: string) => {
    const now = Date.now();
    // 1.5s cooldown guard & ignore duplicate while processing
    if (isProcessingRef.current) return;
    if (token === lastScannedTokenRef.current && now - lastScannedTimeRef.current < 2500) {
      return;
    }

    isProcessingRef.current = true;
    lastScannedTokenRef.current = token;
    lastScannedTimeRef.current = now;

    try {
      const res = await fetch('/api/qrclass/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const json = await res.json();

      const resultItem: CheckinResult = {
        result: json.result || 'invalid',
        husband_name: json.husband_name,
        wife_name: json.wife_name,
        reg_code: json.reg_code,
        checkin_at: json.checkin_at,
      };

      setOverlayData(resultItem);

      // Add to history
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const historyEntry: ScanHistoryItem = {
        id: Math.random().toString(),
        time: timeStr,
        code: json.reg_code || token.slice(0, 8),
        name: json.husband_name ? `${json.husband_name} & ${json.wife_name}` : 'Tidak Dikenal',
        result: resultItem.result,
      };

      setScanHistory((prev) => [historyEntry, ...prev.slice(0, 9)]);

      // Refresh stats if checkin ok
      if (resultItem.result === 'ok') {
        fetchStats();
      }
    } catch (err: any) {
      setOverlayData({ result: 'invalid' });
    } finally {
      // Release processing after 1.5s
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1500);
    }
  };

  // 3. Initialize Camera & BarcodeDetector loop
  useEffect(() => {
    let animFrame: number;
    let barcodeDetector: any = null;

    if ('BarcodeDetector' in window) {
      try {
        barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['qr_code'],
        });
      } catch (e) {
        barcodeDetector = null;
      }
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Check torch support
        const track = stream.getVideoTracks()[0];
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities.torch) {
          setHasTorch(true);
        }

        // Start scanning loop if BarcodeDetector is available
        if (barcodeDetector) {
          const scanLoop = async () => {
            if (
              videoRef.current &&
              videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA &&
              !isProcessingRef.current
            ) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const rawValue = barcodes[0].rawValue;
                  if (rawValue) {
                    processCheckin(rawValue);
                  }
                }
              } catch (err) {
                // Ignore detector frame error
              }
            }
            animFrame = requestAnimationFrame(scanLoop);
          };
          animFrame = requestAnimationFrame(scanLoop);
        }
      } catch (err: any) {
        console.error('Camera error:', err);
        setCameraError(
          'Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan atau gunakan isian manual di bawah.'
        );
      }
    };

    startCamera();

    return () => {
      cancelAnimationFrame(animFrame);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Toggle flashlight / torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.error('Failed to toggle torch:', e);
    }
  };

  // Manual code submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    setLoadingManual(true);
    await processCheckin(manualCode.trim());
    setManualCode('');
    setLoadingManual(false);
  };

  // Logout
  const handleLogout = () => {
    document.cookie = 'qr-staff-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    window.location.href = '/qrclass';
  };

  return (
    <div className="sv-fullscreen">
      {/* 1. Header Bar */}
      <header className="sv-topbar">
        <div className="sv-topbar-info">
          <span className="sv-event-name">{stats.event_title}</span>
          <span className="sv-staff-name">Petugas: {staffName}</span>
        </div>

        <div className="sv-topbar-actions">
          <div className="sv-stats-badge">
            <Icon name="check_circle" size={16} aria-hidden />
            <strong>{stats.attended_count}</strong> / {stats.paid_count} Hadir
          </div>

          {hasTorch && (
            <button
              type="button"
              className={`sv-action-btn ${torchOn ? 'active' : ''}`}
              onClick={toggleTorch}
              aria-label="Nyalakan senter"
            >
              <Icon name={torchOn ? 'flashlight_on' : 'flashlight_off'} size={20} aria-hidden />
            </button>
          )}

          <button
            type="button"
            className="sv-action-btn"
            onClick={handleLogout}
            title="Keluar"
            aria-label="Keluar dari scanner"
          >
            <Icon name="logout" size={20} aria-hidden />
          </button>
        </div>
      </header>

      {/* 2. Camera View & Frame */}
      <div className="sv-camera-wrap">
        <video ref={videoRef} playsInline muted className="sv-video" />

        {cameraError ? (
          <div className="sv-camera-error">
            <Icon name="videocam_off" size={48} aria-hidden />
            <p>{cameraError}</p>
          </div>
        ) : (
          <div className="sv-viewfinder">
            <div className="sv-target-box">
              <div className="sv-corner sv-tl"></div>
              <div className="sv-corner sv-tr"></div>
              <div className="sv-corner sv-bl"></div>
              <div className="sv-corner sv-br"></div>
              <div className="sv-laser"></div>
            </div>
            <p className="sv-hint">Arahkan kamera ke QR Code e-tiket</p>
          </div>
        )}
      </div>

      {/* 3. Bottom Controls & Drawer */}
      <div className={`sv-bottom-panel ${drawerOpen ? 'drawer-open' : ''}`}>
        <div className="sv-drawer-handle" onClick={() => setDrawerOpen(!drawerOpen)}>
          <div className="sv-handle-pill"></div>
          <div className="sv-handle-row">
            <span className="sv-handle-title">
              <Icon name="history" size={18} aria-hidden />
              Riwayat Scan ({scanHistory.length})
            </span>
            <Icon name={drawerOpen ? 'expand_more' : 'expand_less'} size={20} aria-hidden />
          </div>
        </div>

        {/* Manual Input Form */}
        <form onSubmit={handleManualSubmit} className="sv-manual-form">
          <input
            type="text"
            className="sv-manual-input"
            placeholder="Ketik kode registrasi / token manual..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            disabled={loadingManual}
          />
          <button type="submit" className="btn btn-primary btn-sm sv-manual-submit" disabled={loadingManual}>
            {loadingManual ? 'Cek...' : 'Check-in'}
          </button>
        </form>

        {/* Scan History List */}
        {drawerOpen && (
          <div className="sv-history-list">
            {scanHistory.length === 0 ? (
              <p className="sv-history-empty">Belum ada peserta yang di-scan pada sesi ini.</p>
            ) : (
              scanHistory.map((item) => (
                <div key={item.id} className="sv-history-item">
                  <div className="sv-hist-left">
                    <span className={`sv-hist-dot sv-dot-${item.result}`}></span>
                    <div>
                      <strong className="sv-hist-name">{item.name}</strong>
                      <span className="sv-hist-code">{item.code}</span>
                    </div>
                  </div>
                  <span className="sv-hist-time">{item.time}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 4. Result Overlay */}
      {overlayData && (
        <ResultOverlay
          data={overlayData}
          onDismiss={() => setOverlayData(null)}
        />
      )}

      <style>{`
        .sv-fullscreen {
          position: fixed;
          inset: 0;
          background: #0d0a0c;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          overflow: hidden;
          color: white;
          font-family: 'Poppins', sans-serif;
        }

        /* Topbar */
        .sv-topbar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 20;
          background: linear-gradient(to bottom, rgba(13, 10, 12, 0.95), transparent);
          padding: 16px 20px 24px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .sv-topbar-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .sv-event-name {
          font-size: 14px;
          font-weight: 600;
          color: white;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sv-staff-name {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.6);
        }

        .sv-topbar-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .sv-stats-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(46, 158, 107, 0.25);
          color: #64E3A6;
          border: 1px solid rgba(46, 158, 107, 0.5);
          padding: 5px 12px;
          border-radius: var(--radius-sm);
          font-size: 13px;
        }

        .sv-action-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 150ms ease;
        }

        .sv-action-btn:hover { background: rgba(255, 255, 255, 0.3); }
        .sv-action-btn.active { background: var(--warn); color: black; }

        /* Camera & Viewfinder */
        .sv-camera-wrap {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sv-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .sv-camera-error {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 32px;
          text-align: center;
          background: #141113;
          color: rgba(255, 255, 255, 0.8);
          font-size: 14px;
        }

        .sv-viewfinder {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .sv-target-box {
          width: 250px;
          height: 250px;
          position: relative;
        }

        .sv-corner {
          position: absolute;
          width: 28px;
          height: 28px;
          border-color: var(--pink-500);
          border-style: solid;
        }

        .sv-tl { top: 0; left: 0; border-width: 4px 0 0 4px; border-top-left-radius: 12px; }
        .sv-tr { top: 0; right: 0; border-width: 4px 4px 0 0; border-top-right-radius: 12px; }
        .sv-bl { bottom: 0; left: 0; border-width: 0 0 4px 4px; border-bottom-left-radius: 12px; }
        .sv-br { bottom: 0; right: 0; border-width: 0 4px 4px 0; border-bottom-right-radius: 12px; }

        .sv-laser {
          position: absolute;
          left: 10px;
          right: 10px;
          height: 2px;
          background: var(--pink-500);
          box-shadow: 0 0 10px var(--pink-500);
          animation: scanLaser 2s ease-in-out infinite;
        }

        @keyframes scanLaser {
          0%, 100% { top: 12px; opacity: 0.3; }
          50% { top: 236px; opacity: 1; }
        }

        .sv-hint {
          margin-top: 24px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.75);
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
        }

        /* Bottom Drawer */
        .sv-bottom-panel {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 20;
          background: rgba(24, 20, 22, 0.95);
          backdrop-filter: blur(12px);
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          border-top-left-radius: var(--radius-lg);
          border-top-right-radius: var(--radius-lg);
          padding: 12px 18px 24px 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: transform 250ms ease;
        }

        .sv-drawer-handle {
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .sv-handle-pill {
          width: 36px;
          height: 4px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
        }

        .sv-handle-row {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
        }

        .sv-handle-title {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sv-manual-form {
          display: flex;
          gap: 8px;
        }

        .sv-manual-input {
          flex: 1;
          height: 42px;
          padding: 0 14px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: var(--radius-md);
          color: white;
          font-family: inherit;
          font-size: 13px;
          outline: none;
        }

        .sv-manual-input:focus {
          border-color: var(--pink-400);
          background: rgba(255, 255, 255, 0.15);
        }

        .sv-manual-submit {
          flex-shrink: 0;
        }

        .sv-history-list {
          max-height: 220px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 4px;
        }

        .sv-history-empty {
          text-align: center;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          padding: 16px 0;
          margin: 0;
        }

        .sv-history-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.06);
          border-radius: var(--radius-sm);
          padding: 8px 12px;
          font-size: 12px;
        }

        .sv-hist-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sv-hist-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .sv-dot-ok { background: #2E9E6B; }
        .sv-dot-already { background: #C98A12; }
        .sv-dot-unpaid, .sv-dot-wrong_event, .sv-dot-invalid { background: #D64545; }

        .sv-hist-name {
          display: block;
          color: white;
          font-size: 12px;
        }

        .sv-hist-code {
          font-family: monospace;
          color: rgba(255, 255, 255, 0.5);
          font-size: 11px;
        }

        .sv-hist-time {
          color: rgba(255, 255, 255, 0.5);
          font-size: 11px;
        }
      `}</style>
    </div>
  );
}
