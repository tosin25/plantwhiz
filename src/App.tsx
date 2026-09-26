import { useEffect, useRef, useState } from "react";

type GateState =
  | "NAME_INPUT"
  | "WELCOME_NAME"
  | "INITIALIZING"
  | "READY_CHECK"
  | "READY_RESULT"
  | "DEADLINE_CHECK"
  | "CROP_SELECT"
  | "STATION_SELECT"
  | "STATION_UNAVAILABLE"
  | "PLANTING_INTRO"
  | "PLANTING_CHECKING"
  | "PLANTING_RESULT"
  | "RAINFALL_CHECKING"
  | "RAINFALL_RESULT"
  | "RAINFALL_FAIL"
  | "TEMP_CHECKING"
  | "TEMP_RESULT"
  | "TEMP_RESULT_FAIL"
  | "WATERLOG_CHECKING"
  | "WATERLOG_RESULT"
  | "WATERLOG_FAIL"
  | "PEST_CHECKING"
  | "PEST_RESULT"
  | "PEST_RESULT_RISK"
  | "FINAL_DECISION_PASS"
  | "FINAL_DECISION_DEADLINE"
  | "FINAL_DECISION_STOP"
  | "API_ERROR_STATE";

interface CropItem {
  name: string;
  color: string;
  image: string;
}

const STATION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "NCRI Ibadan": { lat: 7.3775, lng: 3.9059 },
  "Bida Station HQ": { lat: 9.0833, lng: 6.0167 }
};

const SEASONAL_PEST_RISK: Record<number, boolean> = {
  0: false, 1: false, 2: false, 3: true, 4: true, 5: true,
  6: false, 7: false, 8: true, 9: true, 10: false, 11: false,
};

const CROP_TEMP_THRESHOLDS: Record<string, { minC: number; sourced: boolean }> = {
  Maize:   { minC: 12, sourced: true },
  Rice:    { minC: 10, sourced: true },
  Soybean: { minC: 10, sourced: true },
  Castor:  { minC: 12, sourced: true },
  Stevia:  { minC: 15, sourced: true },
};

function recommendSuitableCrops(currentTemp: number, excludeCrop: string): string[] {
  return Object.entries(CROP_TEMP_THRESHOLDS)
    .filter(([n, t]) => n !== excludeCrop && currentTemp >= t.minC)
    .map(([n]) => n);
}

async function evaluateEnvironmentalGates(stationName: string, cropName: string) {
  const coords = STATION_COORDINATES[stationName] || STATION_COORDINATES["NCRI Ibadan"];
  const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&daily=precipitation_sum&hourly=soil_temperature_0cm`;

  const response = await fetch(endpoint, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to connect to Open-Meteo API");

  const data = await response.json();
  const currentSoilTemp = data.hourly?.soil_temperature_0cm?.[0] ?? 24;
  const threshold = CROP_TEMP_THRESHOLDS[cropName]?.minC ?? 12;
  const isTempPassing = currentSoilTemp >= threshold;

  const dailyPrecipitation: number[] = data.daily?.precipitation_sum || [15, 10, 8];
  const rollingThreeDayRain = dailyPrecipitation.slice(0, 3).reduce((s, v) => s + (v || 0), 0);
  const isRainfallPassing = rollingThreeDayRain >= 20;

  const latest24hrRain = dailyPrecipitation[0] || 0;
  const isWaterloggingRisk = latest24hrRain > 25;

  return {
    success: true,
    soilTemperature: currentSoilTemp,
    tempPasses: isTempPassing,
    rollingThreeDayRainMM: rollingThreeDayRain,
    rainfallPasses: isRainfallPassing,
    waterloggingRisk: isWaterloggingRisk
  };
}

function App() {
  const [state, setState] = useState<GateState>("NAME_INPUT");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [progress, setProgress] = useState(0);
  const [crop, setCrop] = useState("Maize");
  const [station, setStation] = useState("NCRI Ibadan");
  const [returnTo, setReturnTo] = useState<GateState>("READY_CHECK");
  const [lastCheckingState, setLastCheckingState] = useState<GateState>("RAINFALL_CHECKING");
  const [buttonNearby, setButtonNearby] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [eyeFrame, setEyeFrame] = useState(1);
  const nameButtonRef = useRef<HTMLButtonElement>(null);

  const [apiData, setApiData] = useState({
    soilTemperature: 25,
    tempPasses: true,
    rollingThreeDayRainMM: 35,
    rainfallPasses: true,
    waterloggingRisk: false
  });

  useEffect(() => {
    if (state !== "NAME_INPUT") return;
    const interval = setInterval(() => setEyeFrame((p) => (p % 3) + 1), 900);
    return () => clearInterval(interval);
  }, [state]);

  const crops: CropItem[] = [
    { name: "Maize", color: "#AACAF9", image: "/crops/maize.jpg" },
    { name: "Rice", color: "#FE99D1", image: "/crops/rice.jpg" },
    { name: "Stevia", color: "#F5532C", image: "/crops/stevia.jpg" },
    { name: "Soybean", color: "#68000B", image: "/crops/soybean.jpg" },
    { name: "Castor", color: "#2F2727", image: "/crops/castor.jpg" },
    { name: "Maize-2", color: "#AACAF9", image: "/crops/maize.jpg" },
    { name: "Rice-2", color: "#FE99D1", image: "/crops/rice.jpg" },
    { name: "Stevia-2", color: "#F5532C", image: "/crops/stevia.jpg" },
    { name: "Soybean-2", color: "#68000B", image: "/crops/soybean.jpg" },
    { name: "Castor-2", color: "#2F2727", image: "/crops/castor.jpg" },
  ];

  const stations = ["NCRI Ibadan", "Bida Station HQ"];
  const activeCropObj = crops.find((c) => c.name.replace(/-\d+$/, "") === crop);

  const getBackgroundClass = () => {
    if (state === "CROP_SELECT") return "";
    if (state === "STATION_SELECT") return "bg-olive";
    if (state === "STATION_UNAVAILABLE" || state === "API_ERROR_STATE") return "bg-burgundy";
    if (["PLANTING_INTRO", "PLANTING_CHECKING", "RAINFALL_CHECKING", "TEMP_CHECKING", "WATERLOG_CHECKING", "PEST_CHECKING"].includes(state)) return "bg-skyblue";
    if (["TEMP_RESULT_FAIL", "RAINFALL_FAIL", "WATERLOG_FAIL", "PEST_RESULT_RISK"].includes(state)) return "bg-red";
    if (["TEMP_RESULT", "RAINFALL_RESULT", "WATERLOG_RESULT", "PEST_RESULT"].includes(state)) return "bg-green";
    if (["PLANTING_RESULT", "FINAL_DECISION_PASS", "FINAL_DECISION_DEADLINE", "FINAL_DECISION_STOP", "READY_CHECK", "READY_RESULT", "DEADLINE_CHECK"].includes(state)) return "bg-pink";
    return "bg-red";
  };

  const handleNameScreenPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!nameButtonRef.current) return;
    const r = nameButtonRef.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    setButtonNearby(Math.sqrt((e.clientX - cx) ** 2 + (e.clientY - cy) ** 2) < 90);
  };
  const handleNameScreenPointerLeave = () => setButtonNearby(false);

  const handleNameNext = () => {
    const trimmed = name.trim();
    if (!/^[A-Za-z]{3,7}$/.test(trimmed)) { setNameError("Enter 3–7 letters."); return; }
    setName(trimmed);
    setNameError("");
    setButtonNearby(false);
    setState("WELCOME_NAME");
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (state === "WELCOME_NAME") timer = setTimeout(() => { setProgress(0); setState("INITIALIZING"); }, 1600);
    if (state === "READY_CHECK") timer = setTimeout(() => setState("READY_RESULT"), 2500);
    if (state === "PLANTING_INTRO") timer = setTimeout(() => setState("PLANTING_CHECKING"), 1800);
    if (state === "PLANTING_CHECKING") timer = setTimeout(() => setState("PLANTING_RESULT"), 3200);

    if (state === "RAINFALL_CHECKING") {
      evaluateEnvironmentalGates(station, crop)
        .then((res) => { setApiData(res); timer = setTimeout(() => setState(res.rainfallPasses ? "RAINFALL_RESULT" : "RAINFALL_FAIL"), 1000); })
        .catch(() => { setLastCheckingState("RAINFALL_CHECKING"); setState("API_ERROR_STATE"); });
    }

    if (state === "TEMP_CHECKING") {
      evaluateEnvironmentalGates(station, crop)
        .then((res) => { setApiData(res); timer = setTimeout(() => setState(res.tempPasses ? "TEMP_RESULT" : "TEMP_RESULT_FAIL"), 1000); })
        .catch(() => { setLastCheckingState("TEMP_CHECKING"); setState("API_ERROR_STATE"); });
    }

    if (state === "WATERLOG_CHECKING") {
      evaluateEnvironmentalGates(station, crop)
        .then((res) => { setApiData(res); timer = setTimeout(() => setState(!res.waterloggingRisk ? "WATERLOG_RESULT" : "WATERLOG_FAIL"), 1000); })
        .catch(() => { setLastCheckingState("WATERLOG_CHECKING"); setState("API_ERROR_STATE"); });
    }

    if (state === "PEST_CHECKING") {
      timer = setTimeout(() => {
        const risky = SEASONAL_PEST_RISK[new Date().getMonth()];
        setState(risky ? "PEST_RESULT_RISK" : "PEST_RESULT");
      }, 1200);
    }

    return () => { if (timer) clearTimeout(timer); };
  }, [state, station, crop]);

  useEffect(() => {
    if (state !== "INITIALIZING") return;
    setProgress(0);
    const duration = 6000, interval = 60, steps = duration / interval;
    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setProgress(Math.min(Math.round((currentStep / steps) * 100), 100));
      if (currentStep >= steps) {
        clearInterval(timer);
        setTimeout(() => setState("READY_CHECK"), 1200);
      }
    }, interval);
    return () => clearInterval(timer);
  }, [state]);

  const handleReadyNext = () => setState("CROP_SELECT");
  const handleCropNext = () => setState("STATION_SELECT");

  const getWelcomeCharacterImage = () => {
    if (name.length > 0 || buttonNearby) return "/characters/welcome-buddy (4).png";
    return `/characters/welcome-buddy (${eyeFrame}).png`;
  };

  return (
    <main className="plantwhiz">
      <div
        className={`dynamic-background ${getBackgroundClass()}`}
        style={state === "CROP_SELECT" && activeCropObj ? { backgroundColor: activeCropObj.color } : {}}
      />
      <div className={`sun ${["READY_CHECK", "READY_RESULT", "DEADLINE_CHECK"].includes(state) ? "sun-red" : ""}`} />
      <img src="/characters/welcome-cloud.png" className="welcome-cloud" alt="Cloud" />
      <img src="/Image2.png" className="flower" alt="" />

      <section className="purple-panel">
        <div className="root-circle circle-1" /><div className="root-circle circle-2" />
        <div className="root-circle circle-3" /><div className="root-circle circle-4" />
        <div className="root-circle circle-5" /><div className="root-circle circle-6" />
        <div className="root-circle circle-7" />

        <div
          className="conversation"
          onPointerMove={state === "NAME_INPUT" ? handleNameScreenPointerMove : undefined}
          onPointerLeave={state === "NAME_INPUT" ? handleNameScreenPointerLeave : undefined}
        >
          {state === "NAME_INPUT" && (
            <div className="name-screen">
              <img src={getWelcomeCharacterImage()} className="animated-character" alt="PlantWhiz Character" />
              <div className="name-input-area">
                <input
                  className="name-input" type="text" value={name}
                  onChange={(e) => { setName(e.target.value); setNameError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleNameNext(); }}
                  placeholder="Enter Your Name" maxLength={7} autoComplete="given-name" autoFocus
                />
              </div>
              <button ref={nameButtonRef} className={`name-arrow ${buttonNearby ? "button-nearby" : ""}`} onClick={handleNameNext} aria-label="Continue">→</button>
              {nameError && <span className="input-error">{nameError}</span>}
              <div className="welcome-brand"><strong>Welcome To</strong><strong>PlantWhiz</strong></div>
            </div>
          )}

          {state === "WELCOME_NAME" && (
            <div className="welcome-name">
              <img src="/characters/welcome-buddy (1).png" alt="Buddy" className="mini-buddy buddy-top-left" />
              <h1>Welcome, <span className="welcome-name-text">{name}.</span></h1>
            </div>
          )}

          {state === "INITIALIZING" && (
            <div className="initializing">
              <img src="/characters/welcome-buddy (4).png" alt="Buddy" className="mini-buddy buddy-top-right" />
              <div className="loader-ring"><span /></div>
              <div className="progress-number">{progress}%</div>
              <p>Getting PlantWhiz Ready</p>
            </div>
          )}

          {state === "READY_CHECK" && (
            <div className="kinetic-intro">
              <img src="/characters/welcome-buddy (2).png" alt="Buddy" className="mini-buddy buddy-bottom-right" />
              <h1 className="text-dark">Let&apos;s Start With<br />What&apos;s At Hand,<br />Not Sky!</h1>
            </div>
          )}

          {state === "READY_RESULT" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (3).png" alt="Buddy" className="mini-buddy buddy-top-left" />
              <h1 className="text-dark">Ready To Start?</h1>
              <p className="text-dark-muted">You Have The Key Inputs Needed<br />To Begin The Planting Checks.</p>
              <div className="buttons">
                <button className="pill-button free-roam-btn" onClick={handleReadyNext}>Yesss, Let&apos;s Go</button>
              </div>
            </div>
          )}

          {state === "DEADLINE_CHECK" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (1).png" alt="Buddy" className="mini-buddy buddy-top-right" />
              <h1 className="text-dark">Can You Get Everything<br />Ready In Time?</h1>
              <p className="text-dark-muted">Can You Get Everything Together<br />Before Your Planting Deadline?</p>
              <div className="buttons">
                <button className="pill-button" onClick={() => setState(returnTo)}>Yes, I Can Get Ready In Time</button>
                <button className="pill-button secondary-pill" onClick={() => { setReturnTo("READY_CHECK"); setState("FINAL_DECISION_STOP"); }}>I&apos;m Not Sure I&apos;ll Make It</button>
              </div>
            </div>
          )}

          {state === "CROP_SELECT" && (
            <div className="fade-in-up crop-gate-wrapper">
              <img src="/characters/welcome-buddy (4).png" alt="Buddy" className="mini-buddy buddy-bottom-left" />
              <h1 className="text-dark crop-heading">What Are You<br />Planting?</h1>
              <div className="curved-arch-scroller" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)} onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)}>
                <div className={`curved-arch-track ${isPaused ? "track-paused" : ""}`}>
                  {crops.map((item, index) => {
                    const cleanName = item.name.replace(/-\d+$/, "");
                    const isSelected = crop === cleanName;
                    const archPos = index % 5;
                    return (
                      <div key={item.name + index} className={`curved-arch-card arch-pos-${archPos} ${isSelected ? "arch-card-active" : ""}`} style={{ backgroundColor: item.color }} onClick={() => { setCrop(cleanName); setIsPaused(true); }}>
                        <img src={item.image} alt={cleanName} className="arch-card-artwork-img" />
                        <span className={`deck-card-title ${["#F5532C", "#68000B", "#2F2727"].includes(item.color) ? "text-light" : "text-dark"}`}>{cleanName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="buttons crop-select-buttons">
                <button className="pill-button free-roam-btn" onClick={handleCropNext}>Next</button>
              </div>
            </div>
          )}

          {state === "STATION_SELECT" && (
            <div className="fade-in-up crop-gate-wrapper">
              <img src="/characters/welcome-buddy (2).png" alt="Buddy" className="mini-buddy buddy-top-right" />
              <h1 className="text-dark crop-heading crop-heading-olive">Where Are You<br />Planting?</h1>
              <div className="station-depth-container">
                {stations.map((item, index) => {
                  const isSelected = station === item;
                  return (
                    <div key={item} className={`station-depth-card ${isSelected ? "station-card-active" : ""}`}
                      style={{ backgroundColor: index === 0 ? "#A6C4FF" : "#FFA6D2", zIndex: isSelected ? 30 : 10, transform: isSelected ? "translateY(-6px) scale(1.05)" : "translateY(0) scale(0.95)" }}
                      onClick={() => { setStation(item); setState(item === "Bida Station HQ" ? "STATION_UNAVAILABLE" : "PLANTING_INTRO"); }}>
                      <span className="deck-card-title text-dark" style={{ fontSize: "13px" }}>{item}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {state === "STATION_UNAVAILABLE" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (3).png" alt="Buddy" className="mini-buddy buddy-top-left" />
              <div className="top-card-placeholder" style={{ background: "#A6C4FF" }} />
              <h1 className="text-white" style={{ marginTop: "40px" }}>Oops No<br />Weather Data</h1>
              <div className="buttons" style={{ marginTop: "40px" }}>
                <button className="pill-button" onClick={() => setState("STATION_SELECT")}>Choose Another Station</button>
              </div>
            </div>
          )}

          {state === "API_ERROR_STATE" && (
            <div className="fade-in-up">
              <div className="top-card-placeholder" style={{ background: "#FFA6D2" }} />
              <h1 className="text-white" style={{ marginTop: "30px" }}>Connection Error</h1>
              <p className="text-white" style={{ opacity: 0.8 }}>Unable to retrieve live telemetry for {station}. Please check your connection.</p>
              <div className="buttons" style={{ marginTop: "30px" }}>
                <button className="pill-button" onClick={() => setState(lastCheckingState)}>Retry API Fetch</button>
              </div>
            </div>
          )}

          {state === "PLANTING_INTRO" && (
            <>
              <img src="/characters/welcome-buddy (1).png" alt="Buddy" className="mini-buddy buddy-bottom-right" />
              <h1 className="text-dark standard-screen-heading">Good, {name}.<br />Let Me Check Something...</h1>
              <p>Checking {crop} At {station}.</p>
            </>
          )}

          {state === "PLANTING_CHECKING" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (4).png" alt="Buddy" className="mini-buddy buddy-top-right" />
              <div className="top-badge-placeholder" style={{ background: "#FFA6D2" }} />
              <h1 className="text-dark standard-screen-heading">Checking<br />Plant Window</h1>
              <div className="bottom-content-box"><span className="status-dot" />Checking {station}...</div>
            </div>
          )}

          {state === "PLANTING_RESULT" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (2).png" alt="Buddy" className="mini-buddy buddy-top-left" />
              <div className="top-badge-placeholder wave-overlap" style={{ background: "#FFA6D2" }} />
              <h1 className="text-dark standard-screen-heading">You&apos;re Within<br />The Planting Window.</h1>
              <div className="bottom-content-box" onClick={() => setState("RAINFALL_CHECKING")} style={{ cursor: "pointer" }}>
                <span className="deck-card-title text-light">Next</span>
              </div>
            </div>
          )}

          {state === "RAINFALL_CHECKING" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (4).png" alt="Buddy" className="mini-buddy buddy-bottom-left" />
              <div className="top-badge-placeholder" style={{ background: "#FFA6D2" }} />
              <h1 className="text-dark standard-screen-heading">Checking<br />Rainfall Data...</h1>
              <div className="bottom-content-box"><span className="status-dot" />Fetching fresh precipitation sum...</div>
            </div>
          )}

          {state === "RAINFALL_RESULT" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (3).png" alt="Buddy" className="mini-buddy buddy-top-right" />
              <div className="top-badge-placeholder" style={{ background: "#FFA6D2" }} />
              <h1 className="text-dark standard-screen-heading">Rainfall Is<br />Sufficient.</h1>
              <p className="text-dark-muted">3-day rolling precipitation is {apiData.rollingThreeDayRainMM.toFixed(1)}mm, meeting optimal thresholds for {crop}, {name}.</p>
              <div className="buttons" style={{ marginTop: "15px" }}>
                <button className="pill-button" onClick={() => setState("TEMP_CHECKING")}>Proceed To Temperature</button>
              </div>
            </div>
          )}

          {state === "RAINFALL_FAIL" && (
            <div className="fade-in-up">
              <div className="top-badge-placeholder" style={{ background: "#FE99D1" }} />
              <h1 className="text-light standard-screen-heading">Insufficient<br />Precipitation.</h1>
              <p className="text-light-muted">3-day total is {apiData.rollingThreeDayRainMM.toFixed(1)}mm (below optimal). Re-checking conditions...</p>
              <div className="buttons" style={{ marginTop: "15px" }}>
                <button className="pill-button" onClick={() => setState("RAINFALL_CHECKING")}>Re-check Rainfall</button>
              </div>
            </div>
          )}

          {state === "TEMP_CHECKING" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (4).png" alt="Buddy" className="mini-buddy buddy-top-left" />
              <div className="top-badge-placeholder" style={{ background: "#FFA6D2" }} />
              <h1 className="text-dark standard-screen-heading">Checking Soil<br />Temperature...</h1>
              <div className="bottom-content-box"><span className="status-dot" />Fetching live 0cm thermal sensors...</div>
            </div>
          )}

          {state === "TEMP_RESULT" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (1).png" alt="Buddy" className="mini-buddy buddy-bottom-right" />
              <div className="top-badge-placeholder" style={{ background: "#A3B18A" }} />
              <h1 className="text-dark standard-screen-heading">Soil Thermal<br />Levels Are Optimal.</h1>
              <p className="text-dark-muted">Current ground temperature at {station} is {apiData.soilTemperature.toFixed(1)}°C — ideal for {crop} (needs ≥ {CROP_TEMP_THRESHOLDS[crop]?.minC}°C).</p>
              <div className="buttons" style={{ marginTop: "15px" }}>
                <button className="pill-button" onClick={() => setState("WATERLOG_CHECKING")}>Proceed To Drainage Check</button>
              </div>
            </div>
          )}

          {state === "TEMP_RESULT_FAIL" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (2).png" alt="Buddy" className="mini-buddy buddy-top-right" />
              <div className="top-badge-placeholder" style={{ background: "#FE99D1" }} />
              <h1 className="text-light standard-screen-heading">{crop} Needs<br />Warmer Soil</h1>
              <p className="text-light-muted">Current: {apiData.soilTemperature.toFixed(1)}°C — {crop} needs at least {CROP_TEMP_THRESHOLDS[crop]?.minC}°C.</p>
              {recommendSuitableCrops(apiData.soilTemperature, crop).length > 0 && (
                <p className="text-light-muted" style={{ marginTop: "8px" }}>Based on current conditions, {recommendSuitableCrops(apiData.soilTemperature, crop).join(", ")} would work better right now.</p>
              )}
              <div className="buttons" style={{ marginTop: "15px" }}>
                <button className="pill-button" onClick={() => setState("TEMP_CHECKING")}>Re-check {crop}</button>
                <button className="pill-button secondary-pill-light" onClick={() => setState("CROP_SELECT")}>Choose A Different Crop</button>
              </div>
            </div>
          )}

          {state === "WATERLOG_CHECKING" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (4).png" alt="Buddy" className="mini-buddy buddy-top-left" />
              <div className="top-badge-placeholder" style={{ background: "#FFA6D2" }} />
              <h1 className="text-dark standard-screen-heading">Checking Drainage<br />&amp; Waterlogging...</h1>
              <div className="bottom-content-box"><span className="status-dot" />Evaluating percolation index...</div>
            </div>
          )}

          {state === "WATERLOG_RESULT" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (3).png" alt="Buddy" className="mini-buddy buddy-bottom-left" />
              <div className="top-badge-placeholder" style={{ background: "#FFA6D2" }} />
              <h1 className="text-dark standard-screen-heading">Low Risk Of<br />Waterlogging.</h1>
              <p className="text-dark-muted">Drainage index at {station} shows clear percolation capacity for {crop}.</p>
              <div className="buttons" style={{ marginTop: "15px" }}>
                <button className="pill-button" onClick={() => setState("PEST_CHECKING")}>Proceed To Pest Check</button>
              </div>
            </div>
          )}

          {state === "WATERLOG_FAIL" && (
            <div className="fade-in-up">
              <div className="top-badge-placeholder" style={{ background: "#FE99D1" }} />
              <h1 className="text-light standard-screen-heading">High Waterlogging<br />Risk Detected.</h1>
              <p className="text-light-muted">Recent rainfall intensity indicates potential soil saturation. Re-checking...</p>
              <div className="buttons" style={{ marginTop: "15px" }}>
                <button className="pill-button" onClick={() => setState("WATERLOG_CHECKING")}>Re-check Drainage Risk</button>
              </div>
            </div>
          )}

          {state === "PEST_CHECKING" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (4).png" alt="Buddy" className="mini-buddy buddy-top-right" />
              <div className="top-badge-placeholder" style={{ background: "#FFA6D2" }} />
              <h1 className="text-dark standard-screen-heading">Checking Pest<br />&amp; Disease Risk...</h1>
              <div className="bottom-content-box"><span className="status-dot" />Assessing seasonal pest pressure...</div>
            </div>
          )}

          {state === "PEST_RESULT" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (1).png" alt="Buddy" className="mini-buddy buddy-top-left" />
              <h1 className="text-dark standard-screen-heading">No Unusual<br />Pest Risk</h1>
              <p className="text-dark-muted">Low seasonal pest and disease pressure for {crop} this window.</p>
              <div className="buttons" style={{ marginTop: "15px" }}>
                <button className="pill-button" onClick={() => setState("FINAL_DECISION_PASS")}>Continue</button>
              </div>
            </div>
          )}

          {state === "PEST_RESULT_RISK" && (
            <div className="fade-in-up">
              <div className="top-badge-placeholder" style={{ background: "#FE99D1" }} />
              <h1 className="text-light standard-screen-heading">Elevated Pest<br />Risk This Window</h1>
              <p className="text-light-muted">Could be armyworm, striga, or similar depending on your area.</p>
              <div className="buttons" style={{ marginTop: "15px" }}>
                <button className="pill-button" onClick={() => setState("FINAL_DECISION_PASS")}>Yes, I&apos;m Prepared</button>
                <button className="pill-button secondary-pill" onClick={() => setState("PEST_CHECKING")}>Not Yet — Recheck Later</button>
              </div>
            </div>
          )}

          {state === "FINAL_DECISION_PASS" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (2).png" alt="Buddy" className="mini-buddy buddy-bottom-right" />
              <h1 className="text-dark" style={{ marginTop: "25px", fontSize: "28px" }}>Plant Today, {name}! 🌱</h1>
              <p className="text-dark-muted" style={{ marginTop: "8px" }}>All environmental gates passed for <strong>{crop}</strong> at <strong>{station}</strong>.</p>
              <div className="bottom-content-box" style={{ height: "70px", marginTop: "12px", flexDirection: "column", gap: "2px" }}>
                <span className="deck-card-title text-light" style={{ fontSize: "12px" }}>Expected Harvest Window:</span>
                <span className="deck-card-title text-light" style={{ fontSize: "10px", opacity: 0.85, fontWeight: 400 }}>
                  {crop === "Maize" && "Approx. 90 – 110 Days (Peak Maturity)"}
                  {crop === "Rice" && "Approx. 105 – 135 Days (Flooded Maturity)"}
                  {crop === "Stevia" && "Approx. 80 – 90 Days (Multi-harvest Leaf)"}
                  {crop === "Soybean" && "Approx. 85 – 100 Days (Pod Drydown)"}
                  {crop === "Castor" && "Approx. 120 – 150 Days (Cluster Ripening)"}
                </span>
              </div>
              <div className="buttons" style={{ marginTop: "12px" }}>
                <button className="pill-button free-roam-btn" onClick={() => setState("NAME_INPUT")}>Start New Check</button>
              </div>
            </div>
          )}

          {state === "FINAL_DECISION_DEADLINE" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (3).png" alt="Buddy" className="mini-buddy buddy-top-right" />
              <h1 className="text-dark" style={{ marginTop: "30px" }}>Is There Still Enough Time?</h1>
              <p className="text-dark-muted">Evaluate your current timeline before proceeding.</p>
              <div className="buttons" style={{ marginTop: "20px" }}>
                <button className="pill-button" onClick={() => setState(returnTo)}>Yes, Proceed</button>
                <button className="pill-button secondary-pill" onClick={() => setState("FINAL_DECISION_STOP")}>No, Out of Time</button>
              </div>
            </div>
          )}

          {state === "FINAL_DECISION_STOP" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (1).png" alt="Buddy" className="mini-buddy buddy-top-left" />
              <h1 className="text-dark" style={{ fontSize: "24px", marginTop: "10px" }}>Recommended Alternatives</h1>
              <div className="buttons" style={{ gap: "6px", marginTop: "12px" }}>
                <button className="pill-button" onClick={() => console.log("Early variety")}>Use Early Variety</button>
                <button className="pill-button" onClick={() => console.log("Different crop")}>Choose Different Crop</button>
                <button className="pill-button" onClick={() => console.log("Forage")}>Switch to Forage</button>
                <button className="pill-button secondary-pill" onClick={() => console.log("Reduced yield")}>Accept Reduced Yield</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;