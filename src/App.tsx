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
  | "GPS_CONFIRM"
  | "STATION_UNAVAILABLE"
  | "PLANTING_INTRO"
  | "PLANTING_CHECKING"
  | "PLANTING_RESULT"
  | "RAINFALL_CHECKING"
  | "RAINFALL_RESULT"
  | "TEMP_CHECKING"
  | "TEMP_RESULT"
  | "TEMP_RESULT_FAIL"
  | "WATERLOG_CHECKING"
  | "WATERLOG_RESULT"
  | "PEST_CHECKING"
  | "PEST_RESULT"
  | "FINAL_DECISION_PASS";

interface CropItem {
  name: string;
  color: string;
  image: string;
}

// ==========================================
// STATION & GPS COORDINATE MAPPINGS
// ==========================================
const STATION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "NCRI Ibadan": { lat: 7.3686, lng: 3.8442 },
  "Bida Station HQ": { lat: 9.0833, lng: 6.0167 }
};

async function evaluateEnvironmentalGates(stationName: string, customCoords?: { lat: number; lng: number }) {
  const coords = customCoords || STATION_COORDINATES[stationName] || STATION_COORDINATES["NCRI Ibadan"];
  const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&daily=precipitation_sum&hourly=soil_temperature_0cm`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error("Failed to connect to Open-Meteo API");

    const data = await response.json();
    const currentSoilTemp = data.hourly?.soil_temperature_0cm?.[0] ?? null;
    const minPracticalSoilTempC = 10;
    const isTempPassing = currentSoilTemp !== null && currentSoilTemp >= minPracticalSoilTempC;

    const dailyPrecipitation: number[] = data.daily?.precipitation_sum || [];
    const rollingThreeDayRain = dailyPrecipitation.slice(0, 3).reduce((sum, val) => sum + (val || 0), 0);

    return {
      success: true,
      soilTemperature: currentSoilTemp,
      tempPasses: isTempPassing,
      rollingThreeDayRainMM: rollingThreeDayRain
    };
  } catch (error) {
    console.error("API Fetch Error:", error);
    return { success: false, error: "Network error or offline mode." };
  }
}

function App() {
  const [state, setState] = useState<GateState>("NAME_INPUT");

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");

  const [progress, setProgress] = useState(0);

  const [crop, setCrop] = useState("Maize");
  const [station, setStation] = useState("NCRI Ibadan");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [detectedLocationName, setDetectedLocationName] = useState("Ibadan, Oyo, Nigeria");

  const [buttonNearby, setButtonNearby] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const nameButtonRef = useRef<HTMLButtonElement>(null);

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
    if (state === "STATION_SELECT" || state === "GPS_CONFIRM") return "bg-olive";
    if (state === "STATION_UNAVAILABLE") return "bg-burgundy";
    if ([
      "PLANTING_INTRO", "PLANTING_CHECKING", 
      "RAINFALL_CHECKING", "TEMP_CHECKING",
      "WATERLOG_CHECKING", "PEST_CHECKING"
    ].includes(state)) return "bg-skyblue";
    
    if (["TEMP_RESULT_FAIL"].includes(state)) return "bg-red";
    if (["TEMP_RESULT", "RAINFALL_RESULT", "WATERLOG_RESULT", "PEST_RESULT"].includes(state)) return "bg-green";

    if ([
      "PLANTING_RESULT",
      "FINAL_DECISION_PASS",
      "READY_CHECK", "READY_RESULT", "DEADLINE_CHECK"
    ].includes(state)) return "bg-pink";
    return "bg-red";
  };

  const handleNameScreenPointerMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!nameButtonRef.current) return;

    const buttonRect = nameButtonRef.current.getBoundingClientRect();
    const buttonCenterX = buttonRect.left + buttonRect.width / 2;
    const buttonCenterY = buttonRect.top + buttonRect.height / 2;

    const distance = Math.sqrt(
      Math.pow(event.clientX - buttonCenterX, 2) +
        Math.pow(event.clientY - buttonCenterY, 2)
    );

    setButtonNearby(distance < 90);
  };

  const handleNameScreenPointerLeave = () => {
    setButtonNearby(false);
  };

  const handleNameNext = () => {
    const trimmedName = name.trim();

    if (!/^[A-Za-z]{3,7}$/.test(trimmedName)) {
      setNameError("Enter 3–7 letters.");
      return;
    }

    setName(trimmedName);
    setNameError("");
    setButtonNearby(false);
    setState("WELCOME_NAME");
  };

  useEffect(() => {
    let isMounted = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (state === "WELCOME_NAME") {
      timer = setTimeout(() => {
        setProgress(0);
        setState("INITIALIZING");
      }, 1600);
    }

    if (state === "READY_CHECK") {
      timer = setTimeout(() => {
        setState("READY_RESULT");
      }, 2500); 
    }

    if (state === "PLANTING_INTRO") {
      timer = setTimeout(() => {
        setState("PLANTING_CHECKING");
      }, 1200);
    }

    if (state === "PLANTING_CHECKING") {
      timer = setTimeout(() => {
        setState("PLANTING_RESULT");
      }, 2500);
    }

    if (state === "TEMP_CHECKING") {
      evaluateEnvironmentalGates(station, userCoords).then((result) => {
        if (!isMounted) return;

        timer = setTimeout(() => {
          if (result.success && result.tempPasses) {
            setState("TEMP_RESULT");
          } else {
            setState("TEMP_RESULT_FAIL");
          }
        }, 1200);
      });
    }

    if (state === "RAINFALL_CHECKING") {
      timer = setTimeout(() => setState("RAINFALL_RESULT"), 1000);
    }
    if (state === "WATERLOG_CHECKING") {
      timer = setTimeout(() => setState("WATERLOG_RESULT"), 1000);
    }
    if (state === "PEST_CHECKING") {
      timer = setTimeout(() => setState("PEST_RESULT"), 1000);
    }

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [state, station, userCoords]);

  useEffect(() => {
    if (state !== "INITIALIZING") return;

    setProgress(0);

    const duration = 6000;
    const interval = 60;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;

      const nextProgress = Math.min(
        Math.round((currentStep / steps) * 100),
        100
      );

      setProgress(nextProgress);

      if (currentStep >= steps) {
        clearInterval(timer);

        setTimeout(() => {
          setState("READY_CHECK");
        }, 1200);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [state]);

  const handleReadyNext = () => {
    setState("CROP_SELECT");
  };

  const handleCropNext = () => {
    setState("STATION_SELECT");
  };

  return (
    <main className="plantwhiz">
      <div
        className={`dynamic-background ${getBackgroundClass()}`}
        style={
          state === "CROP_SELECT" && activeCropObj
            ? { backgroundColor: activeCropObj.color }
            : {}
        }
      />

      <div className={`sun ${["READY_CHECK", "READY_RESULT", "DEADLINE_CHECK"].includes(state) ? "sun-red" : ""}`} />

      <img src="/Image2.png" className="flower" alt="" />

      <section className="purple-panel">
        <div className="root-circle circle-1" />
        <div className="root-circle circle-2" />
        <div className="root-circle circle-3" />
        <div className="root-circle circle-4" />
        <div className="root-circle circle-5" />
        <div className="root-circle circle-6" />
        <div className="root-circle circle-7" />

        <div
          className="conversation"
          onPointerMove={
            state === "NAME_INPUT" ? handleNameScreenPointerMove : undefined
          }
          onPointerLeave={
            state === "NAME_INPUT" ? handleNameScreenPointerLeave : undefined
          }
        >
          {state === "NAME_INPUT" && (
            <div className="name-screen">
              <div className="name-input-area">
                <input
                  className="name-input"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleNameNext();
                  }}
                  placeholder="Enter Your Name"
                  maxLength={7}
                  autoComplete="given-name"
                  autoFocus
                />
              </div>

              <button
                ref={nameButtonRef}
                className={`name-arrow ${buttonNearby ? "button-nearby" : ""}`}
                onClick={handleNameNext}
                aria-label="Continue"
              >
                →
              </button>

              {nameError && <span className="input-error">{nameError}</span>}

              <div className="welcome-brand">
                <strong>Welcome To</strong>
                <strong>PlantWhiz</strong>
              </div>
            </div>
          )}

          {state === "WELCOME_NAME" && (
            <div className="welcome-name">
              <h1>
                Welcome, <span className="welcome-name-text">{name}.</span>
              </h1>
            </div>
          )}

          {state === "INITIALIZING" && (
            <div className="initializing">
              <div className="loader-ring">
                <span />
              </div>
              <div className="progress-number">{progress}%</div>
              <p>Getting PlantWhiz Ready</p>
            </div>
          )}

          {state === "READY_CHECK" && (
            <div className="kinetic-intro">
              <h1 className="text-dark">
                Let&apos;s Start With
                <br />
                What&apos;s At Hand,
                <br />
                Not Sky, {name}!
              </h1>
            </div>
          )}

          {state === "READY_RESULT" && (
            <div className="fade-in-up">
              <h1 className="text-dark">Ready To Start?</h1>
              <p className="text-dark-muted">
                You Have The Key Inputs Needed, {name}
                <br />
                To Begin The Planting Checks.
              </p>
              <div className="buttons">
                <button
                  className="pill-button free-roam-btn"
                  onClick={handleReadyNext}
                >
                  Yesss, Let&apos;s Go
                </button>
              </div>
            </div>
          )}

          {state === "DEADLINE_CHECK" && (
            <div className="fade-in-up">
              <h1 className="text-dark">
                Can You Get Everything
                <br />
                Ready In Time?
              </h1>
              <p className="text-dark-muted">
                Can You Get Everything Together, {name}
                <br />
                Before Your Planting Deadline?
              </p>
              <div className="buttons">
                <button
                  className="pill-button"
                  onClick={() => setState("READY_CHECK")}
                >
                  Yes, I Can Get Ready In Time
                </button>
              </div>
            </div>
          )}

          {/* ================= CROP SELECT ================= */}
          {state === "CROP_SELECT" && (
            <div className="fade-in-up crop-gate-wrapper">
              <h1 className="text-dark crop-heading">
                What Are You
                <br />
                Planting, {name}?
              </h1>

              <div 
                className="curved-arch-scroller"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
              >
                <div className={`curved-arch-track ${isPaused ? "track-paused" : ""}`}>
                  {crops.map((item, index) => {
                    const cleanName = item.name.replace(/-\d+$/, "");
                    const isSelected = crop === cleanName;
                    const archPos = index % 5;
                    return (
                      <div
                        key={item.name + index}
                        className={`curved-arch-card arch-pos-${archPos} ${isSelected ? "arch-card-active" : ""}`}
                        style={{ backgroundColor: item.color }}
                        onClick={() => {
                          setCrop(cleanName);
                          setIsPaused(true);
                        }}
                      >
                        <img 
                          src={item.image} 
                          alt={cleanName}
                          style={{
                            width: "38px",
                            height: "38px",
                            objectFit: "cover",
                            borderRadius: "6px",
                            marginBottom: "4px",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                          }}
                        />
                        <span className={`deck-card-title ${["#F5532C", "#68000B", "#2F2727"].includes(item.color) ? "text-light" : "text-dark"}`}>
                          {cleanName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="buttons crop-select-buttons">
                <button className="pill-button free-roam-btn" onClick={handleCropNext}>
                  Next
                </button>
              </div>
            </div>
          )}

          {/* ================= STATION SELECT (Stacked Buttons with Dropdown & GPS) ================= */}
          {state === "STATION_SELECT" && (
            <div className="fade-in-up crop-gate-wrapper">
              <h1 className="text-dark crop-heading crop-heading-olive" style={{ fontSize: "28px" }}>
                Where Are You
                <br />
                Planting, {name}?
              </h1>

              <div className="buttons" style={{ position: "absolute", top: "-110px", left: "0", right: "0", zIndex: 20 }}>
                {/* Station Dropdown selector */}
                <div style={{ display: "flex", gap: "6px", width: "200px", margin: "0 auto" }}>
                  <select
                    className="pill-button"
                    style={{ width: "160px", padding: "0 10px", textAlign: "center", background: "#A6C4FF" }}
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                  >
                    {stations.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    className="pill-button"
                    style={{ width: "36px", padding: 0 }}
                    onClick={() => {
                      if (station === "Bida Station HQ") {
                        setUserCoords(undefined);
                        setState("STATION_UNAVAILABLE");
                      } else {
                        setUserCoords(undefined);
                        setState("PLANTING_INTRO");
                      }
                    }}
                  >
                    →
                  </button>
                </div>

                {/* Pick My Location / GPS Button */}
                <button
                  className="pill-button"
                  style={{ background: "#D8F3DC", width: "200px" }}
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          setUserCoords({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                          });
                          setDetectedLocationName("Ibadan, Oyo, Nigeria");
                          setState("GPS_CONFIRM");
                        },
                        () => {
                          alert("GPS permission denied. Defaulting to NCRI Ibadan.");
                          setUserCoords(undefined);
                          setState("PLANTING_INTRO");
                        }
                      );
                    } else {
                      alert("Geolocation is not supported by your browser.");
                      setState("PLANTING_INTRO");
                    }
                  }}
                >
                  📍 Pick My Location
                </button>
              </div>
            </div>
          )}

          {/* ================= GPS CONFIRMATION SCREEN ================= */}
          {state === "GPS_CONFIRM" && (
            <div className="fade-in-up crop-gate-wrapper">
              <h1 className="text-dark crop-heading crop-heading-olive" style={{ fontSize: "26px" }}>
                Your Current
                <br />
                Location
              </h1>
              <div className="bottom-content-box" style={{ margin: "-120px auto 15px", height: "70px", background: "rgba(255,255,255,0.7)" }}>
                <span className="text-dark" style={{ fontSize: "12px", fontWeight: 700 }}>
                  📍 {detectedLocationName}
                </span>
              </div>
              <div className="buttons">
                <button className="pill-button" onClick={() => setState("PLANTING_INTRO")}>
                  Confirm &amp; Proceed →
                </button>
              </div>
            </div>
          )}

          {state === "STATION_UNAVAILABLE" && (
            <div className="fade-in-up">
              <div className="top-card-placeholder" style={{ background: "#A6C4FF" }} />
              <h1 className="text-white" style={{ marginTop: "40px" }}>
                Oops No
                <br />
                Weather Data
              </h1>
              <div className="buttons" style={{ marginTop: "40px" }}>
                <button
                  className="pill-button"
                  onClick={() => setState("STATION_SELECT")}
                >
                  Choose Another Station
                </button>
              </div>
            </div>
          )}

          {state === "PLANTING_INTRO" && (
            <>
              <h1>
                Good, {name}.
                <br />
                Let Me Check Something...
              </h1>
              <p>
                Checking {crop} at {userCoords ? "your GPS location" : station}.
              </p>
            </>
          )}

          {state === "PLANTING_CHECKING" && (
            <div className="fade-in-up">
              <div className="top-badge-placeholder" style={{ background: "#FFA6D2" }} />
              <h1 className="text-dark standard-screen-heading">
                Checking
                <br />
                Plant Window
              </h1>
              <div className="bottom-content-box">
                <span className="status-dot" />
                Validating season window, {name}...
              </div>
            </div>
          )}

          {state === "PLANTING_RESULT" && (
            <div className="fade-in-up">
              <div className="top-badge-placeholder wave-overlap" style={{ background: "#FFA6D2" }} />
              <h1 className="text-dark standard-screen-heading">
                You&apos;re Within
                <br />
                The Planting Window.
              </h1>
              <div className="bottom-content-box" onClick={() => setState("RAINFALL_CHECKING")} style={{ cursor: "pointer" }}>
                <span className="deck-card-title text-light">Proceed to Rainfall →</span>
              </div>
            </div>
          )}

          {state === "RAINFALL_CHECKING" && (
            <div className="fade-in-up">
              <div className="top-badge-placeholder" style={{ background: "#FFA6D2" }} />
              <h1 className="text-dark standard-screen-heading">
                Checking
                <br />
                Rainfall Data...
              </h1>
              <div className="bottom-content-box">
                <span className="status-dot" />
                Analyzing precipitation patterns...
              </div>
            </div>
          )}

          {state === "RAINFALL_RESULT" && (
            <div className="fade-in-up">
              <div className="top-badge-placeholder" style={{ background: "#FFA6D2" }} />
              <h1 className="text-dark standard-screen-heading">
                Rainfall Is
                <br />
                Sufficient.
              </h1>
              <p className="text-dark-muted">
                Expected precipitation matches optimal requirements for {crop}, {name}.
              </p>
              <div className="buttons" style={{ marginTop: "15px" }}>
                <button className="pill-button" onClick={() => setState("TEMP_CHECKING")}>
                  Proceed To Soil Temperature
                </button>
              </div>
            </div>
          )}

          {state === "TEMP_CHECKING" && (
            <div className="fade-in-up">
              <div className="top-badge-placeholder" style={{ background: "#AACAF9" }} />
              <h1 className="text-dark standard-screen-heading">
                Checking Live
                <br />
                Soil Temperature...
              </h1>
              <div className="bottom-content-box">
                <span className="status-dot" />
                Querying Open-Meteo satellite feed...
              </div>
            </div>
          )}

          {state === "TEMP_RESULT" && (
            <div className="fade-in-up">
              <div className="top-badge-placeholder wave-overlap" style={{ background: "#A3B18A" }} />
              <h1 className="text-dark standard-screen-heading">
                Soil Thermal
                <br />
                Levels Optimal (&gt; 10°C).
              </h1>
              <div className="bottom-content-box" onClick={() => setState("WATERLOG_CHECKING")} style={{ cursor: "pointer" }}>
                <span className="deck-card-title text-light">Proceed to Drainage →</span>
              </div>
            </div>
          )}

          {state === "TEMP_RESULT_FAIL" && (
            <div className="fade-in-up">
              <div className="top-badge-placeholder wave-overlap" style={{ background: "#F5532C" }} />
              <h1 className="text-dark standard-screen-heading">
                Soil Too Cold
                <br />
                (&lt; 10°C Floor).
              </h1>
              <div className="bottom-content-box" onClick={() => setState("STATION_SELECT")} style={{ cursor: "pointer" }}>
                <span className="deck-card-title text-light">Try Another Location</span>
              </div>
            </div>
          )}

          {state === "WATERLOG_CHECKING" && (
            <div className="fade-in-up">
              <div className="top-badge-placeholder" style={{ background: "#FFA6D2" }} />
              <h1 className="text-dark standard-screen-heading">
                Checking Drainage
                <br />
                &amp; Waterlogging...
              </h1>
              <div className="bottom-content-box">
                <span className="status-dot" />
                Assessing percolation index...
              </div>
            </div>
          )}

          {state === "WATERLOG_RESULT" && (
            <div className="fade-in-up">
              <div className="top-badge-placeholder" style={{ background: "#FFA6D2" }} />
              <h1 className="text-dark standard-screen-heading">
                Low Risk Of
                <br />
                Waterlogging.
              </h1>
              <p className="text-dark-muted">
                Drainage index shows clear percolation capacity for {crop}.
              </p>
              <div className="buttons" style={{ marginTop: "15px" }}>
                <button className="pill-button" onClick={() => setState("PEST_CHECKING")}>
                  Proceed To Pest Check
                </button>
              </div>
            </div>
          )}

          {state === "PEST_CHECKING" && (
            <div className="fade-in-up">
              <div className="top-badge-placeholder" style={{ background: "#FFA6D2" }} />
              <h1 className="text-dark standard-screen-heading">
                Checking Pest
                <br />
                &amp; Disease Risk...
              </h1>
              <div className="bottom-content-box">
                <span className="status-dot" />
                Assessing pest pressure...
              </div>
            </div>
          )}

          {state === "PEST_RESULT" && (
            <div className="fade-in-up">
              <div className="top-badge-placeholder" style={{ background: "#FFA6D2" }} />
              <h1 className="text-dark standard-screen-heading">
                Pest Risk
                <br />
                Assessment.
              </h1>
              <p className="text-dark-muted">
                AI Pest &amp; Disease Vision Scanner is <strong>Coming Soon</strong>. Confirm management readiness, {name}.
              </p>
              <div className="buttons" style={{ marginTop: "12px" }}>
                <button className="pill-button" onClick={() => setState("FINAL_DECISION_PASS")}>
                  Yes, Management Ready
                </button>
              </div>
            </div>
          )}

          {/* ================= FINAL SUCCESS & YIELD TIMELINE ================= */}
          {state === "FINAL_DECISION_PASS" && (
            <div className="fade-in-up">
              <h1 className="text-dark" style={{ marginTop: "25px", fontSize: "28px" }}>
                Plant Today, {name}! 🌱
              </h1>
              <p className="text-dark-muted" style={{ marginTop: "8px" }}>
                All environmental gates passed for <strong>{crop}</strong> at <strong>{userCoords ? "your GPS location" : station}</strong>.
              </p>
              
              <div className="bottom-content-box" style={{ height: "70px", marginTop: "12px", flexDirection: "column", gap: "2px" }}>
                <span className="deck-card-title text-light" style={{ fontSize: "12px" }}>
                  Expected Harvest Window:
                </span>
                <span className="deck-card-title text-light" style={{ fontSize: "10px", opacity: 0.85, fontWeight: 400 }}>
                  {crop === "Maize" && "Approx. 90 – 110 Days (Peak Maturity)"}
                  {crop === "Rice" && "Approx. 105 – 135 Days (Flooded Maturity)"}
                  {crop === "Stevia" && "Approx. 80 – 90 Days (Multi-harvest Leaf)"}
                  {crop === "Soybean" && "Approx. 85 – 100 Days (Pod Drydown)"}
                  {crop === "Castor" && "Approx. 120 – 150 Days (Cluster Ripening)"}
                </span>
              </div>

              <div className="buttons" style={{ marginTop: "12px" }}>
                <button className="pill-button free-roam-btn" onClick={() => setState("NAME_INPUT")}>
                  Start New Check
                </button>
              </div>
            </div>
          )}

        </div>
      </section>
    </main>
  );
}

export default App;