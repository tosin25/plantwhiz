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
  | "TEMP_CHECKING"
  | "TEMP_RESULT"
  | "TEMP_RESULT_FAIL"
  | "WATERLOG_CHECKING"
  | "WATERLOG_RESULT"
  | "PEST_CHECKING"
  | "PEST_RESULT"
  | "FINAL_DECISION_PASS"
  | "FINAL_DECISION_DEADLINE"
  | "FINAL_DECISION_STOP";

interface CropItem {
  name: string;
  color: string;
  image: string;
}

function App() {
  const [state, setState] = useState<GateState>("NAME_INPUT");

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");

  const [progress, setProgress] = useState(0);

  const [crop, setCrop] = useState("Maize");
  const [station, setStation] = useState("");
  const [returnTo, setReturnTo] = useState<GateState>("READY_CHECK");

  const [buttonNearby, setButtonNearby] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Snappy eye frame cycle state (1 to 3) for the welcome screen
  const [eyeFrame, setEyeFrame] = useState(1);
  const nameButtonRef = useRef<HTMLButtonElement>(null);

  // Fast eye blink/change cadence on welcome screen
  useEffect(() => {
    if (state !== "NAME_INPUT") return;
    const interval = setInterval(() => {
      setEyeFrame((prev) => (prev % 3) + 1);
    }, 900); // Snappy transition speed restored
    return () => clearInterval(interval);
  }, [state]);

  // Full crop items with clean .jpg public assets
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

  /* =================================
     DYNAMIC THEME & BACKGROUND LOGIC
  ================================= */
  const activeCropObj = crops.find((c) => c.name.replace(/-\d+$/, "") === crop);
  
  const getBackgroundClass = () => {
    if (state === "CROP_SELECT") return ""; 
    if (state === "STATION_SELECT") return "bg-olive";
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
      "FINAL_DECISION_PASS", "FINAL_DECISION_DEADLINE", "FINAL_DECISION_STOP",
      "READY_CHECK", "READY_RESULT", "DEADLINE_CHECK"
    ].includes(state)) return "bg-pink";
    return "bg-red";
  };

  /* =================================
     NAME BUTTON PROXIMITY
  ================================= */

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

  /* =================================
     AUTO-ADVANCE TIMERS
  ================================= */
  useEffect(() => {
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
      }, 1800);
    }

    if (state === "PLANTING_CHECKING") {
      timer = setTimeout(() => {
        setState("PLANTING_RESULT");
      }, 7200);
    }

    if (state === "RAINFALL_CHECKING") {
      timer = setTimeout(() => setState("RAINFALL_RESULT"), 2200);
    }
    if (state === "TEMP_CHECKING") {
      timer = setTimeout(() => setState("TEMP_RESULT"), 2000);
    }
    if (state === "WATERLOG_CHECKING") {
      timer = setTimeout(() => setState("WATERLOG_RESULT"), 2400);
    }
    if (state === "PEST_CHECKING") {
      timer = setTimeout(() => setState("PEST_RESULT"), 2200);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [state]);

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

  // Welcome screen character helper using frame 4 for typing/proximity, and 1-3 for snappy eye blink frames
  const getWelcomeCharacterImage = () => {
    if (name.length > 0 || buttonNearby) {
      return "/characters/welcome-buddy (4).png";
    }
    return `/characters/welcome-buddy (${eyeFrame}).png`;
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

      <img src="/characters/welcome-cloud.png" className="welcome-cloud" alt="Cloud" />
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
          {/* ================= NAME INPUT (Cinematic Cropped/Blurred with Snappy Eyes) ================= */}
          {state === "NAME_INPUT" && (
            <div className="name-screen">
              <img
                src={getWelcomeCharacterImage()}
                className="animated-character"
                alt="PlantWhiz Character"
              />

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

          {/* ================= SUBORDINATE SCREENS (Uncropped Miniature Buddies) ================= */}
          {state === "WELCOME_NAME" && (
            <div className="welcome-name">
              <img src="/characters/welcome-buddy (1).png" alt="Buddy" className="mini-buddy buddy-top-left" />
              <h1>
                Welcome, <span className="welcome-name-text">{name}.</span>
              </h1>
            </div>
          )}

          {state === "INITIALIZING" && (
            <div className="initializing">
              <img src="/characters/welcome-buddy (4).png" alt="Buddy" className="mini-buddy buddy-top-right" />
              <div className="loader-ring">
                <span />
              </div>
              <div className="progress-number">{progress}%</div>
              <p>Getting PlantWhiz Ready</p>
            </div>
          )}

          {state === "READY_CHECK" && (
            <div className="kinetic-intro">
              <img src="/characters/welcome-buddy (2).png" alt="Buddy" className="mini-buddy buddy-bottom-right" />
              <h1 className="text-dark">
                Let&apos;s Start With
                <br />
                What&apos;s At Hand,
                <br />
                Not Sky!
              </h1>
            </div>
          )}

          {state === "READY_RESULT" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (3).png" alt="Buddy" className="mini-buddy buddy-top-left" />
              <h1 className="text-dark">Ready To Start?</h1>
              <p className="text-dark-muted">
                You Have The Key Inputs Needed
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
              <img src="/characters/welcome-buddy (1).png" alt="Buddy" className="mini-buddy buddy-top-right" />
              <h1 className="text-dark">
                Can You Get Everything
                <br />
                Ready In Time?
              </h1>
              <p className="text-dark-muted">
                Can You Get Everything Together
                <br />
                Before Your Planting Deadline?
              </p>
              <div className="buttons">
                <button
                  className="pill-button"
                  onClick={() => {
                    setReturnTo("READY_CHECK");
                    setState("FINAL_DECISION_DEADLINE");
                  }}
                >
                  Yes, I Can Get Ready In Time
                </button>
                <button
                  className="pill-button secondary-pill"
                  onClick={() => {
                    setReturnTo("READY_CHECK");
                    setState("FINAL_DECISION_DEADLINE");
                  }}
                >
                  I&apos;m Not Sure I&apos;ll Make It
                </button>
              </div>
            </div>
          )}

          {state === "CROP_SELECT" && (
            <div className="fade-in-up crop-gate-wrapper">
              <img src="/characters/welcome-buddy (4).png" alt="Buddy" className="mini-buddy buddy-bottom-left" />
              <h1 className="text-dark crop-heading">
                What Are You
                <br />
                Planting?
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
                          className="arch-card-artwork-img"
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

          {state === "STATION_SELECT" && (
            <div className="fade-in-up crop-gate-wrapper">
              <img src="/characters/welcome-buddy (2).png" alt="Buddy" className="mini-buddy buddy-top-right" />
              <h1 className="text-dark crop-heading crop-heading-olive">
                Where Are You
                <br />
                Planting?
              </h1>

              <div className="station-depth-container">
                {stations.map((item, index) => {
                  const isSelected = station === item;
                  return (
                    <div
                      key={item}
                      className={`station-depth-card ${isSelected ? "station-card-active" : ""}`}
                      style={{ 
                        backgroundColor: index === 0 ? "#A6C4FF" : "#FFA6D2",
                        zIndex: isSelected ? 30 : 10,
                        transform: isSelected ? "translateY(-6px) scale(1.05)" : "translateY(0) scale(0.95)"
                      }}
                      onClick={() => {
                        setStation(item);
                        if (item === "Bida Station HQ") {
                          setState("STATION_UNAVAILABLE");
                        } else {
                          setState("PLANTING_INTRO");
                        }
                      }}
                    >
                      <span className="deck-card-title text-dark" style={{ fontSize: "13px" }}>
                        {item}
                      </span>
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
              <img src="/characters/welcome-buddy (1).png" alt="Buddy" className="mini-buddy buddy-bottom-right" />
              <h1>
                Good, {name}.
                <br />
                Let Me Check Something...
              </h1>
              <p>
                Checking {crop} At {station}.
              </p>
            </>
          )}

          {state === "PLANTING_CHECKING" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (4).png" alt="Buddy" className="mini-buddy buddy-top-right" />
              <div className="top-badge-placeholder" style={{ background: "#FFA6D2" }} />
              <h1 className="text-dark standard-screen-heading">
                Checking
                <br />
                Plant Window
              </h1>
              <div className="bottom-content-box">
                <span className="status-dot" />
                Checking {station}...
              </div>
            </div>
          )}

          {state === "PLANTING_RESULT" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (2).png" alt="Buddy" className="mini-buddy buddy-top-left" />
              <div className="top-badge-placeholder wave-overlap" style={{ background: "#FFA6D2" }} />
              <h1 className="text-dark standard-screen-heading">
                You&apos;re Within
                <br />
                The Planting Window.
              </h1>
              <div className="bottom-content-box" onClick={() => setState("RAINFALL_CHECKING")} style={{ cursor: "pointer" }}>
                <span className="deck-card-title text-light">Next</span>
              </div>
            </div>
          )}

          {state === "RAINFALL_CHECKING" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (4).png" alt="Buddy" className="mini-buddy buddy-bottom-left" />
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
              <img src="/characters/welcome-buddy (3).png" alt="Buddy" className="mini-buddy buddy-top-right" />
              <div className="top-badge-placeholder" style={{ background: "#FFA6D2" }} />
              <h1 className="text-dark standard-screen-heading">
                Rainfall Is
                <br />
                Sufficient.
              </h1>
              <p className="text-dark-muted">
                Based on {station} data for {crop}, expected precipitation matches optimal planting requirements, {name}.
              </p>
              <div className="buttons" style={{ marginTop: "15px" }}>
                <button className="pill-button" onClick={() => setState("TEMP_CHECKING")}>
                  Proceed To Temperature
                </button>
              </div>
            </div>
          )}

          {state === "TEMP_CHECKING" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (4).png" alt="Buddy" className="mini-buddy buddy-top-left" />
              <div className="top-badge-placeholder" style={{ background: "#FFA6D2" }} />
              <h1 className="text-dark standard-screen-heading">
                Checking Soil
                <br />
                Temperature...
              </h1>
              <div className="bottom-content-box">
                <span className="status-dot" />
                Reading thermal sensors...
              </div>
            </div>
          )}

          {state === "TEMP_RESULT" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (1).png" alt="Buddy" className="mini-buddy buddy-bottom-right" />
              <div className="top-badge-placeholder" style={{ background: "#A3B18A" }} />
              <h1 className="text-dark standard-screen-heading">
                Soil Thermal
                <br />
                Levels Are Optimal.
              </h1>
              <p className="text-dark-muted">
                Current ground temperature at {station} is ideal for root germination, {name}.
              </p>
              <div className="buttons" style={{ marginTop: "15px" }}>
                <button className="pill-button" onClick={() => setState("WATERLOG_CHECKING")}>
                  Proceed To Drainage Check
                </button>
              </div>
            </div>
          )}

          {state === "TEMP_RESULT_FAIL" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (2).png" alt="Buddy" className="mini-buddy buddy-top-right" />
              <div className="top-badge-placeholder" style={{ background: "#FE99D1" }} />
              <h1 className="text-light standard-screen-heading">
                Temperature
                <br />
                Too Cold.
              </h1>
              <p className="text-light-muted">
                Thermal levels at {station} are currently below optimal range for {crop}.
              </p>
              <div className="buttons" style={{ marginTop: "15px" }}>
                <button className="pill-button" onClick={() => setState("TEMP_CHECKING")}>
                  Re-check Conditions
                </button>
                <button className="pill-button secondary-pill-light" onClick={() => setState("FINAL_DECISION_STOP")}>
                  Explore Alternatives
                </button>
              </div>
            </div>
          )}

          {state === "WATERLOG_CHECKING" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (4).png" alt="Buddy" className="mini-buddy buddy-top-left" />
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
              <img src="/characters/welcome-buddy (3).png" alt="Buddy" className="mini-buddy buddy-bottom-left" />
              <div className="top-badge-placeholder" style={{ background: "#FFA6D2" }} />
              <h1 className="text-dark standard-screen-heading">
                Low Risk Of
                <br />
                Waterlogging.
              </h1>
              <p className="text-dark-muted">
                Drainage index at {station} shows clear percolation capacity for {crop}.
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
              <img src="/characters/welcome-buddy (4).png" alt="Buddy" className="mini-buddy buddy-top-right" />
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
              <img src="/characters/welcome-buddy (1).png" alt="Buddy" className="mini-buddy buddy-top-left" />
              <div className="top-badge-placeholder" style={{ background: "#FFA6D2" }} />
              <h1 className="text-dark standard-screen-heading">
                Pest Risk
                <br />
                Assessment.
              </h1>
              <p className="text-dark-muted">
                AI Pest &amp; Disease Vision Scanner is <strong>Coming Soon</strong>. Confirm management readiness.
              </p>
              <div className="buttons" style={{ marginTop: "12px" }}>
                <button className="pill-button" onClick={() => setState("FINAL_DECISION_PASS")}>
                  Yes, Management Ready
                </button>
                <button className="pill-button secondary-pill" onClick={() => setState("PEST_CHECKING")}>
                  Re-evaluate Risk
                </button>
              </div>
            </div>
          )}

          {state === "FINAL_DECISION_PASS" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (2).png" alt="Buddy" className="mini-buddy buddy-bottom-right" />
              <h1 className="text-dark" style={{ marginTop: "25px", fontSize: "28px" }}>
                Plant Today, {name}! 🌱
              </h1>
              <p className="text-dark-muted" style={{ marginTop: "8px" }}>
                All environmental gates passed for <strong>{crop}</strong> at <strong>{station}</strong>.
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

          {state === "FINAL_DECISION_DEADLINE" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (3).png" alt="Buddy" className="mini-buddy buddy-top-right" />
              <h1 className="text-dark" style={{ marginTop: "30px" }}>Is There Still Enough Time?</h1>
              <p className="text-dark-muted">Evaluate your current timeline before proceeding.</p>
              <div className="buttons" style={{ marginTop: "20px" }}>
                <button className="pill-button" onClick={() => setState(returnTo)}>
                  Yes, Proceed
                </button>
                <button className="pill-button secondary-pill" onClick={() => setState("FINAL_DECISION_STOP")}>
                  No, Out of Time
                </button>
              </div>
            </div>
          )}

          {state === "FINAL_DECISION_STOP" && (
            <div className="fade-in-up">
              <img src="/characters/welcome-buddy (1).png" alt="Buddy" className="mini-buddy buddy-top-left" />
              <h1 className="text-dark" style={{ fontSize: "24px", marginTop: "10px" }}>Recommended Alternatives</h1>
              <div className="buttons" style={{ gap: "6px", marginTop: "12px" }}>
                <button className="pill-button" onClick={() => console.log("Early variety")}>
                  Use Early Variety
                </button>
                <button className="pill-button" onClick={() => console.log("Different crop")}>
                  Choose Different Crop
                </button>
                <button className="pill-button" onClick={() => console.log("Forage")}>
                  Switch to Forage
                </button>
                <button className="pill-button secondary-pill" onClick={() => console.log("Reduced yield")}>
                  Accept Reduced Yield
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