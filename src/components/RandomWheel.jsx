import React, { useState, useEffect, useRef } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import ToolHeader from './ui/ToolHeader';
import FieldInput from './ui/FieldInput';

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

      ctx.font = `bold ${fontSize}px "TASA Orbiter", "Inter", sans-serif`;
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

  // Cleanup animation frame only on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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
    let startTime = null;
    const duration = 4000; // 4 seconds

    const animate = (time) => {
      const currentTime = time || performance.now();
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
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
    <Card id="tool-wheel" variant="tool" size="wide">
      <ToolHeader 
        title="Random Decision Wheel" 
        description="Type options, customize the title, spin the wheel to select a random item, or reset selections." 
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6 lg:gap-8 w-full items-start mt-3">
        
        {/* Left side: Wheel Canvas & Win Banner */}
        <div className="flex flex-col items-center justify-center relative w-full bg-app border border-border rounded-2xl p-8 min-h-[520px] max-[768px]:p-[20px_12px] max-[768px]:min-h-0">
          <div className="bg-slate-900/75 dark:bg-black/75 backdrop-blur-md border border-white/10 text-white px-9 py-2.5 rounded-full font-display font-bold text-lg mb-6 text-center shadow-lg select-none z-[5] tracking-wide max-[768px]:px-6 max-[768px]:py-2 max-[768px]:text-[1.1rem] max-[768px]:mb-4" id="wheel-display-title">
            {title}
          </div>
          <div className="relative w-full max-w-[420px] aspect-square rounded-full shadow-[0_16px_40px_rgba(0,0,0,0.08)] bg-card overflow-visible cursor-pointer transition-transform duration-200 hover:scale-[1.01]" id="wheel-canvas-wrapper">
            <canvas ref={canvasRef} id="wheel-canvas" className="w-full h-full block" width="450" height="450" onClick={spin}></canvas>
            <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 flex items-center drop-shadow-md pointer-events-none" onClick={spin}>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="red">
                <polygon points="24,12 0,4 0,20" />
              </svg>
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-[76px] h-[76px] rounded-full bg-gradient-to-br from-card to-app border-4 border-accent shadow-[0_4px_12px_rgba(0,0,0,0.15),_inset_0_2px_4px_rgba(255,255,255,0.2)] flex items-center justify-center z-[8] font-display font-extrabold text-[0.95rem] color-accent tracking-wider select-none transition-all duration-200 hover:scale-108 hover:bg-accent hover:text-white hover:border-white hover:shadow-[0_6px_18px_rgba(79,70,229,0.4)] active:scale-96 max-[768px]:w-[50px] max-[768px]:h-[50px] max-[768px]:text-[0.7rem]" id="wheel-spin-btn-center" onClick={spin}>
              <span>SPIN</span>
            </div>
          </div>

          {/* Result overlay banner */}
          {showWinnerBanner && winner && (
            <div id="wheel-result-banner" className="mt-6 w-full max-w-[420px] bg-accent-light border-2 border-accent rounded-xl p-[16px_20px] flex items-center justify-between gap-4 animate-[bannerPopIn_0.35s_cubic-bezier(0.34,1.56,0.64,1)]" style={{ display: 'flex' }}>
              <span className="text-[0.75rem] uppercase font-bold text-text-muted tracking-wider">Winning Selection</span>
              <strong className="text-xl md:text-2xl font-bold text-accent font-display flex-grow text-center word-break break-all" id="wheel-result-text">{winner.text}</strong>
              <button
                id="wheel-result-close"
                className="background-transparent border-none text-text-muted text-2xl cursor-pointer transition-colors duration-200 px-1 line-height-none hover:text-text-main"
                aria-label="Close banner"
                onClick={() => setShowWinnerBanner(false)}
              >
                &times;
              </button>
            </div>
          )}
        </div>

        {/* Right side: Controls & Options */}
        <div className="flex flex-col gap-5 bg-sidebar border border-border rounded-2xl p-6 max-[768px]:p-4">
          <div className="flex gap-3 w-full">
            <Button id="wheel-spin-btn" className="flex-1" variant="primary" onClick={spin} disabled={isSpinning}>Spin</Button>
            <Button id="wheel-reset-btn" className="flex-1" variant="secondary" onClick={resetItems} disabled={isSpinning}>Reset</Button>
          </div>

          {/* Options Box with View Mode and Edit Mode */}
          <div className="border border-border rounded-xl bg-app overflow-hidden min-h-[280px] flex flex-col">
            <div className="flex-grow flex flex-col">
              {/* View Mode (List View) */}
              {!isEditing && (
                <div id="wheel-list-view" className="p-4 h-[280px] overflow-y-auto flex flex-col gap-2">
                  {items.length === 0 ? (
                    <div className="text-text-muted italic p-3 text-sm text-center">
                      No options typed. Press Edit to add options.
                    </div>
                  ) : (
                    items.map(item => (
                      <div key={item.id} className={`p-[8px_12px] rounded-lg text-[0.95rem] bg-card border border-border text-text-main font-medium transition-all duration-200 break-all text-left ${item.disabled ? '!bg-slate-500/5 dark:!bg-slate-400/5 !border-border !text-text-muted line-through opacity-65' : ''}`}>
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
                  className="p-4 h-[280px] w-full border-none bg-transparent text-text-main font-sans text-[0.95rem] leading-relaxed resize-none outline-none"
                  placeholder="Type options here, one per line..."
                  value={textareaVal}
                  onChange={(e) => handleTextareaChange(e.target.value)}
                />
              )}
            </div>
            
            <div className="flex gap-2 p-2 justify-end items-center border-t border-border bg-card">
              <label className="flex items-center gap-2 cursor-pointer select-none mr-auto">
                <input
                  type="checkbox"
                  id="wheel-allow-duplicate"
                  className="w-auto cursor-pointer"
                  checked={allowDuplicate}
                  onChange={(e) => setAllowDuplicate(e.target.checked)}
                />
                <span className="text-xs text-text-muted font-medium">Allow duplicates</span>
              </label>

              <Button
                id="wheel-title-btn"
                size="sm"
                variant="secondary"
                onClick={() => setShowTitleInput(prev => !prev)}
              >
                Title
              </Button>
              <Button
                id="wheel-edit-btn"
                size="sm"
                variant={isEditing ? 'primary' : 'secondary'}
                onClick={() => setIsEditing(prev => !prev)}
              >
                {isEditing ? 'Done' : 'Edit'}
              </Button>
              <Button
                id="wheel-clear-btn"
                size="sm"
                variant="secondary"
                onClick={() => !isSpinning && setShowClearModal(true)}
                disabled={isSpinning}
              >
                Clear
              </Button>
            </div>
          </div>

          {showTitleInput && (
            <div id="wheel-title-input-group" className="flex flex-col gap-2 w-full">
              <FieldInput
                id="wheel-title-input"
                label="Edit Wheel Title"
                type="text"
                placeholder="Random Wheel"
                value={title}
                onChange={(e) => setTitle(e.target.value || 'Random Wheel')}
              />
            </div>
          )}

          {/* Keyboard shortcuts reminder */}
          <div className="bg-slate-500/[0.03] dark:bg-slate-400/[0.03] border border-dashed border-border rounded-xl p-4 mt-2">
            <h4 className="text-[0.8rem] font-bold text-text-muted uppercase tracking-wider mb-2.5">Keyboard Shortcuts</h4>
            <ul className="list-none p-0 m-0 flex flex-col gap-2">
              <li className="text-[0.8rem] text-text-muted flex items-center gap-2">
                <kbd className="bg-card border border-border rounded px-1.5 py-0.5 shadow-sm text-text-main font-bold text-[0.75rem]">Space</kbd> 
                <span>Spin the wheel</span>
              </li>
              <li className="text-[0.8rem] text-text-muted flex items-center gap-2">
                <kbd className="bg-card border border-border rounded px-1.5 py-0.5 shadow-sm text-text-main font-bold text-[0.75rem]">E</kbd> 
                <span>Toggle Edit/View mode</span>
              </li>
              <li className="text-[0.8rem] text-text-muted flex items-center gap-2">
                <kbd className="bg-card border border-border rounded px-1.5 py-0.5 shadow-sm text-text-main font-bold text-[0.75rem]">R</kbd> 
                <span>Reset wheel items</span>
              </li>
              <li className="text-[0.8rem] text-text-muted flex items-center gap-2">
                <kbd className="bg-card border border-border rounded px-1.5 py-0.5 shadow-sm text-text-main font-bold text-[0.75rem]">C</kbd> 
                <span>Clear all text (requires confirmation)</span>
              </li>
            </ul>
          </div>
        </div>

      </div>

      {/* Confirmation Clear Modal */}
      {showClearModal && (
        <div id="wheel-clear-modal" className="fixed inset-0 z-[1000] flex items-center justify-center p-5" style={{ display: 'flex' }}>
          <div id="wheel-clear-modal-backdrop" className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowClearModal(false)}></div>
          <div className="relative bg-card border border-border rounded-2xl p-7 max-w-[420px] w-full shadow-2xl z-[1001] flex flex-col gap-4 animate-[modalSlideIn_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
            <h3 className="font-display text-lg font-bold text-text-main">Clear All Options?</h3>
            <p className="text-sm text-text-muted leading-relaxed">Are you sure you want to clear all the typed options? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end mt-2">
              <Button id="wheel-confirm-clear-btn" variant="dangerConfirm" onClick={confirmClear}>Yes, Clear All</Button>
              <Button id="wheel-cancel-clear-btn" variant="secondary" onClick={() => setShowClearModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
