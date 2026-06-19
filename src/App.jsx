import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./App.css";

const vaMonthlyBase = {
  0: 0,
  10: 180.42,
  20: 356.66,
  30: 552.47,
  40: 795.84,
  50: 1132.9,
  60: 1435.02,
  70: 1808.45,
  80: 2102.15,
  90: 2362.3,
  100: 3938.57,
};

const stateBenefits = {
  california: [
    "CalVet College Fee Waiver",
    "Disabled Veterans Property Tax Exemption",
    "California Disabled Veteran License Plates",
  ],
  texas: [
    "Hazlewood Act Education Benefit",
    "Disabled Veteran Property Tax Exemption",
    "Texas DV Plates and Parking Benefits",
  ],
  florida: [
    "Florida Homestead Property Tax Benefits",
    "Disabled Veteran License Plate Benefits",
    "State Park Fee Discounts",
  ],
  arizona: [
    "Arizona Property Tax Exemption",
    "Arizona Veteran Tuition Benefits",
    "Disabled Veteran Plate Benefits",
  ],
  nevada: [
    "Nevada Veterans Tax Exemption",
    "Disabled Veteran License Plate Benefits",
    "Nevada Veterans Services Assistance",
  ],
};

function currency(value) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function App() {
  const reportRef = useRef(null);

  const [view, setView] = useState("assessment");
  const [adminStats, setAdminStats] = useState(null);

  const [form, setForm] = useState({
    first_name: "",
    email: "",
    state: "",
    service_branch: "",
    disability_rating: "",
    gi_bill_percent: "",
    dependents: "",
    employed: false,
    interested_in_vre: false,
    interested_in_ssdi: false,
  });

  const [message, setMessage] = useState("");
  const [results, setResults] = useState(null);

  const calculateResults = () => {
    const rating = Number(form.disability_rating);
    const giBill = Number(form.gi_bill_percent);
    const dependents = Number(form.dependents);
    const stateKey = form.state.trim().toLowerCase();

    const roundedRating = Math.min(
      100,
      Math.max(0, Math.round(rating / 10) * 10)
    );

    const baseMonthly = vaMonthlyBase[roundedRating] || 0;
    const dependentEstimate =
      roundedRating >= 30 && dependents > 0 ? dependents * 65 : 0;

    const estimatedMonthly = baseMonthly + dependentEstimate;
    const estimatedAnnual = estimatedMonthly * 12;

    let score = 0;
    if (roundedRating >= 10) score += 20;
    if (roundedRating >= 30 && dependents > 0) score += 15;
    if (giBill > 0) score += 15;
    if (form.interested_in_vre) score += 20;
    if (stateBenefits[stateKey]) score += 15;
    if (form.interested_in_ssdi && !form.employed) score += 15;
    if (form.interested_in_ssdi && form.employed) score -= 10;

    score = Math.max(0, Math.min(100, score));

    const rankedBenefits = [
      {
        name: "VR&E",
        priority: form.interested_in_vre ? "High" : "Medium",
      },
      {
        name: "VA Disability Compensation",
        priority:
          roundedRating >= 70 ? "High" : roundedRating >= 30 ? "Medium" : "Low",
      },
      {
        name: "State Veteran Benefits",
        priority: stateBenefits[stateKey] ? "High" : "Review",
      },
      {
        name: "GI Bill",
        priority: giBill >= 80 ? "High" : giBill > 0 ? "Medium" : "Low",
      },
      {
        name: "SSDI",
        priority:
          form.interested_in_ssdi && form.employed
            ? "Caution"
            : form.interested_in_ssdi
            ? "Review"
            : "Low",
      },
    ];

    return {
      roundedRating,
      estimatedMonthly,
      estimatedAnnual,
      score,
      rankedBenefits,
      stateBenefits: stateBenefits[stateKey] || [
        "State-specific benefits not loaded yet. Check your state veterans affairs website.",
      ],
      disabilityPriority:
        roundedRating >= 70 ? "High" : roundedRating >= 30 ? "Medium" : "Low",
      dependentPriority:
        roundedRating >= 30 && dependents > 0 ? "High" : "Low",
      giBillPriority: giBill >= 80 ? "High" : giBill > 0 ? "Medium" : "Low",
      vrePriority: form.interested_in_vre ? "High" : "Medium",
      ssdiPriority:
        form.interested_in_ssdi && form.employed
          ? "Caution"
          : form.interested_in_ssdi
          ? "Review"
          : "Low",
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const calculated = calculateResults();

    const { error } = await supabase.from("assessments").insert([
      {
        first_name: form.first_name,
        email: form.email,
        state: form.state,
        service_branch: form.service_branch,
        disability_rating: Number(form.disability_rating),
        gi_bill_percent: Number(form.gi_bill_percent),
        dependents: Number(form.dependents),
        employed: form.employed,
        interested_in_vre: form.interested_in_vre,
        interested_in_ssdi: form.interested_in_ssdi,
      },
    ]);

    if (error) {
      console.error(error);
      setMessage("Failed to save assessment");
      return;
    }

    setMessage("Assessment saved successfully");
    setResults(calculated);
  };

  const loadAdminStats = async () => {
    const { data, error } = await supabase
      .from("assessments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    const total = data.length;
    const averageRating =
      total > 0
        ? Math.round(
            data.reduce(
              (sum, row) => sum + Number(row.disability_rating || 0),
              0
            ) / total
          )
        : 0;

    const states = {};
    const branches = {};

    data.forEach((row) => {
      if (row.state) states[row.state] = (states[row.state] || 0) + 1;
      if (row.service_branch)
        branches[row.service_branch] = (branches[row.service_branch] || 0) + 1;
    });

    setAdminStats({
      total,
      averageRating,
      states,
      branches,
      recent: data.slice(0, 10),
    });
  };

  useEffect(() => {
    if (view === "admin") loadAdminStats();
  }, [view]);

  const downloadPDF = async () => {
    const input = reportRef.current;
    if (!input) return;

    const canvas = await html2canvas(input, {
      scale: 2,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pdfWidth = 210;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("VA-Benefits-Report.pdf");
  };

  const styles = {
    page: {
      minHeight: "100vh",
      background: "#eef3f8",
      color: "#172033",
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    },
    hero: {
      background: "linear-gradient(135deg, #0b1f3a 0%, #123f73 100%)",
      color: "white",
      padding: "42px 24px",
      borderBottom: "4px solid #d6a935",
    },
    shell: {
      maxWidth: "1120px",
      margin: "0 auto",
    },
    heroGrid: {
      display: "grid",
      gridTemplateColumns: "1.4fr 0.8fr",
      gap: "24px",
      alignItems: "center",
    },
    eyebrow: {
      textTransform: "uppercase",
      letterSpacing: "0.12em",
      fontSize: "12px",
      fontWeight: 700,
      color: "#f2d27c",
      marginBottom: "8px",
    },
    title: {
      fontSize: "42px",
      lineHeight: 1.05,
      margin: "0 0 12px",
    },
    subtitle: {
      maxWidth: "680px",
      color: "#dbe7f5",
      fontSize: "17px",
      lineHeight: 1.6,
      margin: 0,
    },
    heroCard: {
      background: "rgba(255,255,255,0.1)",
      border: "1px solid rgba(255,255,255,0.2)",
      borderRadius: "18px",
      padding: "22px",
    },
    nav: {
      display: "flex",
      gap: "10px",
      marginTop: "22px",
      flexWrap: "wrap",
    },
    content: {
      maxWidth: "1120px",
      margin: "0 auto",
      padding: "28px 24px 60px",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "20px",
      alignItems: "start",
    },
    card: {
      background: "#ffffff",
      border: "1px solid #dce5ef",
      borderRadius: "18px",
      padding: "22px",
      boxShadow: "0 10px 30px rgba(18, 63, 115, 0.08)",
    },
    reportCard: {
      background: "#ffffff",
      border: "1px solid #dce5ef",
      borderRadius: "18px",
      padding: "22px",
      marginBottom: "16px",
      boxShadow: "0 10px 30px rgba(18, 63, 115, 0.08)",
    },
    label: {
      display: "block",
      fontSize: "13px",
      fontWeight: 700,
      color: "#334155",
      marginBottom: "7px",
    },
    input: {
      width: "100%",
      boxSizing: "border-box",
      padding: "12px 13px",
      borderRadius: "12px",
      border: "1px solid #cbd5e1",
      outline: "none",
      fontSize: "15px",
      background: "#fbfdff",
    },
    field: {
      marginBottom: "16px",
    },
    checkboxRow: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "11px 12px",
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      marginBottom: "10px",
      fontWeight: 600,
    },
    button: {
      padding: "12px 18px",
      borderRadius: "12px",
      border: "none",
      cursor: "pointer",
      fontWeight: 800,
      background: "#d6a935",
      color: "#0b1f3a",
      boxShadow: "0 8px 18px rgba(214, 169, 53, 0.22)",
    },
    secondaryButton: {
      padding: "12px 18px",
      borderRadius: "12px",
      border: "1px solid rgba(255,255,255,0.3)",
      cursor: "pointer",
      fontWeight: 800,
      background: "rgba(255,255,255,0.12)",
      color: "white",
    },
    mutedButton: {
      padding: "12px 18px",
      borderRadius: "12px",
      border: "1px solid #cbd5e1",
      cursor: "pointer",
      fontWeight: 800,
      background: "#ffffff",
      color: "#123f73",
    },
    note: {
      color: "##1e293b",
      fontSize: "14px",
      lineHeight: 1.55,
    },
    badge: {
      display: "inline-block",
      padding: "6px 10px",
      borderRadius: "999px",
      background: "#e8f1fb",
      color: "#123f73",
      fontWeight: 800,
      fontSize: "12px",
    },
    scoreCircle: {
      width: "132px",
      height: "132px",
      borderRadius: "50%",
      display: "grid",
      placeItems: "center",
      background: "linear-gradient(135deg, #123f73, #0b1f3a)",
      color: "white",
      fontSize: "34px",
      fontWeight: 900,
      marginBottom: "12px",
      border: "6px solid #d6a935",
    },
    statGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "16px",
    },
    statNumber: {
      fontSize: "36px",
      fontWeight: 900,
      margin: "4px 0",
      color: "#123f73",
    },
  };

  return (
    <div style={styles.page}>
      <header style={styles.hero}>
        <div style={styles.shell}>
          <div style={styles.heroGrid}>
            <div>
              <div style={styles.eyebrow}>Veteran Benefits Planning Tool</div>
              <h1 style={styles.title}>VA Benefits Maximizer</h1>
              <p style={styles.subtitle}>
                Build a personalized benefits snapshot covering VA disability,
                GI Bill, VR&E, state programs, dependents, and SSDI
                considerations.
              </p>

              <div style={styles.nav}>
                <button
                  style={view === "assessment" ? styles.button : styles.secondaryButton}
                  onClick={() => setView("assessment")}
                >
                  Assessment
                </button>

                <button
                  style={view === "admin" ? styles.button : styles.secondaryButton}
                  onClick={() => setView("admin")}
                >
                  Admin Dashboard
                </button>
              </div>
            </div>

            <div style={styles.heroCard}>
              <h3 style={{ marginTop: 0 }}>Educational Estimate Only</h3>
              <p style={{ color: "#dbe7f5", lineHeight: 1.55, marginBottom: 0 }}>
                This app is not legal, financial, medical, or VA-accredited
                advice. Users should verify benefits with VA.gov, SSA, state
                agencies, or an accredited representative.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main style={styles.content}>
        {view === "assessment" && (
          <div style={styles.grid}>
            <section style={styles.card}>
              <span style={styles.badge}>Step 1 of 1</span>
              <h2>Benefits Assessment</h2>
              <p style={styles.note}>
                Enter basic information to generate an estimated benefits
                opportunity report.
              </p>

              <form onSubmit={handleSubmit}>
                <div style={styles.field}>
                  <label style={styles.label}>First Name</label>
                  <input
                    style={styles.input}
                    type="text"
                    value={form.first_name}
                    onChange={(e) =>
                      setForm({ ...form, first_name: e.target.value })
                    }
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    style={styles.input}
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>State</label>
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="California, Texas, Florida..."
                    value={form.state}
                    onChange={(e) =>
                      setForm({ ...form, state: e.target.value })
                    }
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Service Branch</label>
                  <select
                    style={styles.input}
                    value={form.service_branch}
                    onChange={(e) =>
                      setForm({ ...form, service_branch: e.target.value })
                    }
                  >
                    <option value="">Select Branch</option>
                    <option>Air Force</option>
                    <option>Army</option>
                    <option>Navy</option>
                    <option>Marine Corps</option>
                    <option>Coast Guard</option>
                    <option>Space Force</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>VA Disability Rating (%)</label>
                  <input
                    style={styles.input}
                    type="number"
                    min="0"
                    max="100"
                    step="10"
                    value={form.disability_rating}
                    onChange={(e) =>
                      setForm({ ...form, disability_rating: e.target.value })
                    }
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>GI Bill Percentage</label>
                  <input
                    style={styles.input}
                    type="number"
                    min="0"
                    max="100"
                    value={form.gi_bill_percent}
                    onChange={(e) =>
                      setForm({ ...form, gi_bill_percent: e.target.value })
                    }
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Number of Dependents</label>
                  <input
                    style={styles.input}
                    type="number"
                    min="0"
                    value={form.dependents}
                    onChange={(e) =>
                      setForm({ ...form, dependents: e.target.value })
                    }
                  />
                </div>

                <label style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={form.employed}
                    onChange={(e) =>
                      setForm({ ...form, employed: e.target.checked })
                    }
                  />
                  Currently Employed
                </label>

                <label style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={form.interested_in_vre}
                    onChange={(e) =>
                      setForm({ ...form, interested_in_vre: e.target.checked })
                    }
                  />
                  Interested in VR&E
                </label>

                <label style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={form.interested_in_ssdi}
                    onChange={(e) =>
                      setForm({ ...form, interested_in_ssdi: e.target.checked })
                    }
                  />
                  Interested in SSDI
                </label>

                <button type="submit" style={styles.button}>
                  Generate Benefits Report
                </button>
              </form>

              {message && <h3>{message}</h3>}
            </section>

            <section>
              {!results && (
                <div style={styles.card}>
                  <h2>Your report will appear here</h2>
                  <p style={styles.note}>
                    After submission, this area will show a benefits opportunity
                    score, estimated compensation, state-specific benefits, and
                    a recommended action plan.
                  </p>
                </div>
              )}

              {results && (
                <>
                  <button onClick={downloadPDF} style={styles.button}>
                    Download PDF Report
                  </button>

                  <div ref={reportRef} style={{ marginTop: "18px" }}>
                    <div style={styles.reportCard}>
                      <h2>
                        {form.first_name
                          ? `${form.first_name}'s Estimated Benefits Report`
                          : "Your Estimated Benefits Report"}
                      </h2>
                      <p style={styles.note}>
                        Educational estimate only. Verify official benefit
                        amounts and eligibility with the appropriate agency.
                      </p>
                    </div>

                    <div style={styles.reportCard}>
                      <h3>Benefits Opportunity Score</h3>
                      <div style={styles.scoreCircle}>{results.score}</div>
                      <p style={styles.note}>
                        This score estimates how many benefit areas may be worth
                        reviewing based on the information entered.
                      </p>
                    </div>

                    <div style={styles.reportCard}>
                      <h3>Estimated VA Disability Compensation</h3>
                      <p><strong>Rating used:</strong> {results.roundedRating}%</p>
                      <p><strong>Estimated monthly value:</strong> {currency(results.estimatedMonthly)}</p>
                      <p><strong>Estimated annual value:</strong> {currency(results.estimatedAnnual)}</p>
                      <p><strong>Priority:</strong> {results.disabilityPriority}</p>
                    </div>

                    <div style={styles.reportCard}>
                      <h3>Ranked Benefit Opportunities</h3>
                      <ol>
                        {results.rankedBenefits.map((benefit) => (
                          <li key={benefit.name}>
                            <strong>{benefit.name}</strong> — {benefit.priority}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div style={styles.reportCard}>
                      <h3>State-Specific Benefits</h3>
                      <p><strong>State entered:</strong> {form.state || "Not provided"}</p>
                      <ul>
                        {results.stateBenefits.map((benefit) => (
                          <li key={benefit}>{benefit}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={styles.reportCard}>
                      <h3>Recommended Action Plan</h3>
                      <ol>
                        <li>Verify your current combined rating on VA.gov.</li>
                        <li>Confirm all dependents are added to your VA profile.</li>
                        <li>Compare VR&E before using more GI Bill entitlement.</li>
                        <li>Review state-specific veteran benefits.</li>
                        <li>Download your benefits letters and rating decision letters.</li>
                        <li>Talk to a VSO or accredited representative before complex claims.</li>
                      </ol>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        {view === "admin" && (
          <section>
            <h2>Admin Dashboard</h2>

            {!adminStats && <p>Loading...</p>}

            {adminStats && (
              <>
                <div style={styles.statGrid}>
                  <div style={styles.card}>
                    <span style={styles.badge}>Total</span>
                    <div style={styles.statNumber}>{adminStats.total}</div>
                    <p style={styles.note}>Assessments submitted</p>
                  </div>

                  <div style={styles.card}>
                    <span style={styles.badge}>Average</span>
                    <div style={styles.statNumber}>
                      {adminStats.averageRating}%
                    </div>
                    <p style={styles.note}>Average VA rating entered</p>
                  </div>

                  <div style={styles.card}>
                    <span style={styles.badge}>Leads</span>
                    <div style={styles.statNumber}>
                      {adminStats.recent.length}
                    </div>
                    <p style={styles.note}>Recent saved leads</p>
                  </div>
                </div>

                <div style={{ height: "18px" }} />

                <div style={styles.grid}>
                  <div style={styles.card}>
                    <h3>States</h3>
                    <ul>
                      {Object.entries(adminStats.states).map(([state, count]) => (
                        <li key={state}>
                          {state}: {count}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={styles.card}>
                    <h3>Service Branches</h3>
                    <ul>
                      {Object.entries(adminStats.branches).map(
                        ([branch, count]) => (
                          <li key={branch}>
                            {branch}: {count}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </div>

                <div style={{ height: "18px" }} />

                <div style={styles.card}>
                  <h3>Recent Leads</h3>
                  <ul>
                    {adminStats.recent.map((lead) => (
                      <li key={lead.id}>
                        {lead.first_name || "No name"} —{" "}
                        {lead.email || "No email"} — {lead.state || "No state"} —{" "}
                        {lead.disability_rating || 0}%
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;