import React, { useState, useEffect, useRef } from 'react';

const colors = [
  "hsl(224, 76%, 60%)",  // indigo
  "hsl(142, 72%, 45%)",  // emerald
  "hsl(38, 92%, 50%)",   // amber
  "hsl(330, 81%, 60%)",  // pink/rose
  "hsl(194, 91%, 48%)",  // cyan
  "hsl(262, 83%, 62%)",  // purple
  "hsl(16, 90%, 54%)",   // orange
  "hsl(209, 89%, 52%)"   // bright blue
];

export default function RandomWheel() {
  const [items, setItems] = useState([
    { text: '1', id: 0, disabled: false },
    { text: '2', id: 1, disabled: false },
    { text: '3', id: 2, disabled: false },
    { text: '4', id: 3, disabled: false },
    { text: '5', id: 4, disabled: false },
  ]);
  
  const [textareaVal, setTextareaVal] = useState("1\n2\n3\n4\n5");
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("Random Wheel");
  const [showTitleInput, setShowTitleInput] = useState(false);
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  
  const [winner, setWinner] = useState(null);
  const [showWinnerBanner, setShowWinnerBanner] = useState(false);
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  
  const [showClearModal, setShowClearModal] = useState(false);

  const canvasRef = useRef(null);
  const rotationAngleRef = useRef(0);
  const animationFrameRef = useRef(null);

  // Sync textarea edits to items state
  const handleTextareaChange = (val) => {
    setTextareaVal(val);
    const lines = val.split(/\r?\n/).map(line => line.trim());
    
    // Remember disabled status by text value
    const disabledTexts = new Set(
      items.filter(item => item.disabled).map(item => item.text)
    );

    let parsedCount = 0;
    const newItems = [];
    lines.forEach(line => {
      if (line !== "") {
        newItems.push({
          text: line,
          id: parsedCount++,
          disabled: disabledTexts.has(line)
        });
      }
    });
    setItems(newItems);
  };

  const drawWheel = (angle) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpi = window.devicePixelRatio || 1;
    const size = 450;
    const radius = 210;
    const centerX = size / 2;
    const centerY = size / 2;

    canvas.width = size * dpi;
    canvas.height = size * dpi;
    ctx.scale(dpi, dpi);
    ctx.clearRect(0, 0, size, size);

    const activeItems = items.filter(item => !item.disabled);

    if (activeItems.length === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(148, 163, 184, 0.1)";
      ctx.fill();
      ctx.strokeStyle = "var(--border-color)";
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = "var(--text-muted)";
      ctx.font = '500 16px "Inter", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No active options", centerX, centerY);

      ctx.beginPath();
      ctx.arc(centerX, centerY, 38, 0, 2 * Math.PI);
      ctx.fillStyle = "var(--bg-card)";
      ctx.fill();
      ctx.strokeStyle = "var(--border-color)";
      ctx.lineWidth = 3;
      ctx.stroke();
      return;
    }

    const arcSize = (2 * Math.PI) / activeItems.length;

    // Draw sectors
    for (let i = 0; i < activeItems.length; i++) {
      const startAngle = angle + i * arcSize;
      const endAngle = angle + (i + 1) * arcSize;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Draw text labels
    for (let i = 0; i < activeItems.length; i++) {
      const startAngle = angle + i * arcSize;
      const midAngle = startAngle + arcSize / 2;
      
      ctx.save();
      ctx.translate(centerX, centerY);

      const isLeftHalf = Math.cos(midAngle) < 0;
      ctx.fillStyle = "#ffffff";
      
      let fontSize = 16;
      if (activeItems.length > 20) fontSize = 10;
      else if (activeItems.length > 12) fontSize = 12;
      else if (activeItems.length > 8) fontSize = 14;

      ctx.font = `bold ${fontSize}px "Outfit", "Inter", sans-serif`;
      ctx.textBaseline = "middle";

      ctx.shadowColor = "rgba(15, 23, 42, 0.35)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      const label = activeItems[i].text;
      let displayLabel = label;
      if (label.length > 16) {
        displayLabel = label.substring(0, 14) + "...";
      }

      if (isLeftHalf) {
        ctx.rotate(midAngle + Math.PI);
        ctx.textAlign = "left";
        ctx.fillText(displayLabel, -(radius - 28), 0);
      } else {
        ctx.rotate(midAngle);
        ctx.textAlign = "right";
        ctx.fillText(displayLabel, radius - 28, 0);
      }
      
      ctx.restore();
    }

    // Center hub
    ctx.beginPath();
    ctx.arc(centerX, centerY, 38, 0, 2 * Math.PI);
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    ctx.fillStyle = isDark ? "#111827" : "#ffffff";
    ctx.fill();
    ctx.strokeStyle = isDark ? "#6366f1" : "#4f46e5";
    ctx.lineWidth = 4;
    ctx.stroke();
  };

  // Redraw when items, rotationAngle or theme changes
  useEffect(() => {
    drawWheel(rotationAngle);
  }, [items, rotationAngle]);

  // Handle key listeners and redraw on theme change
  useEffect(() => {
    // Redraw on theme toggles
    const handleThemeChange = () => {
      setTimeout(() => drawWheel(rotationAngleRef.current), 50);
    };

    const toggleBtn = document.getElementById("theme-toggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", handleThemeChange);
    }

    // Keyboard Shortcuts
    const handleKeyDown = (e) => {
      // Do not intercept if focus is inside input/textarea fields
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable)) {
        if (e.key === "Escape" && activeEl.id === "wheel-text-input") {
          setIsEditing(false);
        }
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        spin();
      } else if (e.key.toLowerCase() === "r") {
        resetItems();
      } else if (e.key.toLowerCase() === "c") {
        setShowClearModal(true);
      } else if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        setIsEditing(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (toggleBtn) {
        toggleBtn.removeEventListener("click", handleThemeChange);
      }
      window.removeEventListener("keydown", handleKeyDown);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [items, isSpinning, allowDuplicate]);

  const spin = () => {
    if (isSpinning) return;
    
    // Auto-save edit mode if open
    setIsEditing(false);

    const activeItems = items.filter(item => !item.disabled);
    if (activeItems.length === 0) {
      alert("Please add at least one active option to spin the wheel!");
      return;
    }

    setIsSpinning(true);
    setShowWinnerBanner(false);

    // Select winner
    const winIndex = Math.floor(Math.random() * activeItems.length);
    const arcSize = (2 * Math.PI) / activeItems.length;
    
    const targetSectorCenter = winIndex * arcSize + arcSize / 2;
    const spinsCount = 6 + Math.floor(Math.random() * 4); // 6 to 9 full spins
    const targetAngle = 2 * Math.PI * spinsCount - targetSectorCenter;

    const startAngleVal = rotationAngleRef.current % (2 * Math.PI);
    const startTime = performance.now();
    const duration = 4000; // 4 seconds

    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // quintic ease-out deceleration curve
      const ease = 1 - Math.pow(1 - progress, 5);
      const angle = startAngleVal + (targetAngle - startAngleVal) * ease;
      rotationAngleRef.current = angle;

      drawWheel(angle);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        rotationAngleRef.current = targetAngle;
        setRotationAngle(targetAngle);
        
        // Announce winner
        const winItem = activeItems[winIndex];
        setWinner(winItem);
        setShowWinnerBanner(true);

        if (!allowDuplicate) {
          setItems(prevItems => 
            prevItems.map(it => it.id === winItem.id ? { ...it, disabled: true } : it)
          );
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const resetItems = () => {
    if (isSpinning) return;
    setItems(prevItems => prevItems.map(it => ({ ...it, disabled: false })));
    setShowWinnerBanner(false);
  };

  const confirmClear = () => {
    setShowClearModal(false);
    setTextareaVal("");
    setItems([]);
    setIsEditing(true);
    setShowWinnerBanner(false);
  };

  return (
    <article id="tool-wheel" className="tool-card tool-card--wide active">
      <div className="wheel-layout">
        
        {/* Left side: Wheel Canvas & Win Banner */}
        <div className="wheel-canvas-container">
          <div className="wheel-title-pill" id="wheel-display-title">{title}</div>
          <div className="wheel-canvas-wrapper" id="wheel-canvas-wrapper">
            <canvas ref={canvasRef} id="wheel-canvas" width="450" height="450" onClick={spin}></canvas>
            <div className="wheel-pointer" onClick={spin}>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="red">
                <polygon points="24,12 0,4 0,20" />
              </svg>
            </div>
            <div className="wheel-spin-btn-center" id="wheel-spin-btn-center" onClick={spin}>
              <span>SPIN</span>
            </div>
          </div>

          {/* Result overlay banner */}
          {showWinnerBanner && winner && (
            <div id="wheel-result-banner" className="wheel-result-banner" style={{ display: 'flex' }}>
              <span className="result-banner-title">Winning Selection</span>
              <strong id="wheel-result-text">{winner.text}</strong>
              <button
                id="wheel-result-close"
                className="result-banner-close"
                aria-label="Close banner"
                onClick={() => setShowWinnerBanner(false)}
              >
                &times;
              </button>
            </div>
          )}
        </div>

        {/* Right side: Controls & Options */}
        <div className="wheel-controls-panel">
          <div className="wheel-actions-row">
            <button id="wheel-spin-btn" className="btn-primary" onClick={spin} disabled={isSpinning}>Spin</button>
            <button id="wheel-reset-btn" className="btn-secondary" onClick={resetItems} disabled={isSpinning}>Reset</button>
          </div>

          {/* Options Box with View Mode and Edit Mode */}
          <div className="wheel-options-container">
            <div className="wheel-list-container">
              {/* View Mode (List View) */}
              {!isEditing && (
                <div id="wheel-list-view" className="wheel-list-view scrollable">
                  {items.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px', fontSize: '0.9rem', textAlign: 'center' }}>
                      No options typed. Press Edit to add options.
                    </div>
                  ) : (
                    items.map(item => (
                      <div key={item.id} className={`wheel-list-item ${item.disabled ? 'eliminated' : ''}`}>
                        {item.text}
                      </div>
                    ))
                  )}
                </div>
              )}
              {/* Edit Mode (Textarea Input) */}
              {isEditing && (
                <textarea
                  id="wheel-text-input"
                  className="wheel-text-input"
                  rows="12"
                  placeholder="Type options here, one per line..."
                  value={textareaVal}
                  onChange={(e) => handleTextareaChange(e.target.value)}
                />
              )}
            </div>
            
            <div className="wheel-options-footer" style={{ alignItems: 'center' }}>
              <label className="toggle-switch" style={{ marginRight: 'auto' }}>
                <input
                  type="checkbox"
                  id="wheel-allow-duplicate"
                  checked={allowDuplicate}
                  onChange={(e) => setAllowDuplicate(e.target.checked)}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label" style={{ fontSize: '0.8rem' }}>Allow duplicates</span>
              </label>

              <button
                id="wheel-title-btn"
                className="btn-secondary-sm"
                onClick={() => setShowTitleInput(prev => !prev)}
              >
                Title
              </button>
              <button
                id="wheel-edit-btn"
                className={`btn-secondary-sm ${isEditing ? 'btn-primary-sm' : ''}`}
                onClick={() => setIsEditing(prev => !prev)}
              >
                {isEditing ? 'Done' : 'Edit'}
              </button>
              <button
                id="wheel-clear-btn"
                className="btn-secondary-sm"
                onClick={() => !isSpinning && setShowClearModal(true)}
                disabled={isSpinning}
              >
                Clear
              </button>
            </div>
          </div>

          {showTitleInput && (
            <div id="wheel-title-input-group" className="form-group" style={{ display: 'block', transition: 'all 0.3s ease' }}>
              <label htmlFor="wheel-title-input">Edit Wheel Title</label>
              <input
                id="wheel-title-input"
                type="text"
                placeholder="Random Wheel"
                value={title}
                onChange={(e) => setTitle(e.target.value || 'Random Wheel')}
              />
            </div>
          )}

          {/* Keyboard shortcuts reminder */}
          <div className="keyboard-shortcuts-card">
            <h4>Keyboard Shortcuts</h4>
            <ul>
              <li><kbd>Space</kbd> Spin the wheel</li>
              <li><kbd>E</kbd> Toggle Edit/View mode</li>
              <li><kbd>R</kbd> Reset wheel items</li>
              <li><kbd>C</kbd> Clear all text (requires confirmation)</li>
            </ul>
          </div>
        </div>

      </div>

      {/* Confirmation Clear Modal */}
      {showClearModal && (
        <div id="wheel-clear-modal" className="custom-modal" style={{ display: 'flex' }}>
          <div id="wheel-clear-modal-backdrop" className="modal-backdrop" onClick={() => setShowClearModal(false)}></div>
          <div className="modal-content">
            <h3>Clear All Options?</h3>
            <p>Are you sure you want to clear all the typed options? This action cannot be undone.</p>
            <div className="modal-actions">
              <button id="wheel-confirm-clear-btn" className="btn-danger-confirm" onClick={confirmClear}>Yes, Clear All</button>
              <button id="wheel-cancel-clear-btn" className="btn-secondary" onClick={() => setShowClearModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
