import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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

function AssessmentPage() {
  const reportRef = useRef(null);

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

    return {
      roundedRating,
      estimatedMonthly,
      estimatedAnnual,
      score,
      rankedBenefits: [
        {
          name: "VR&E",
          priority: form.interested_in_vre ? "High" : "Medium",
        },
        {
          name: "VA Disability Compensation",
          priority:
            roundedRating >= 70
              ? "High"
              : roundedRating >= 30
              ? "Medium"
              : "Low",
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
      ],
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
    fetch("/api/send-lead-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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
        }),
      }).catch((err) => console.error("Lead email failed:", err));
  };

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

  return (
    <div className="landing-page">
      <header className="landing-hero">
        <nav className="landing-nav">
          <div className="brand">VA Benefits Maximizer</div>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/admin">Admin</Link>
          </div>
        </nav>

        <section className="hero-content">
          <div>
            <p className="eyebrow">Free Benefits Assessment</p>
            <h1>Generate Your Personalized Benefits Report</h1>
            <p className="hero-subtitle">
              Enter your information below to estimate benefit opportunities
              across VA disability, GI Bill, VR&E, state benefits, dependents,
              and SSDI considerations.
            </p>
          </div>

          <div className="score-preview">
            <p>Educational Estimate</p>
            <div className="score-number">Free</div>
            <span>2-minute assessment</span>
          </div>
        </section>
      </header>

      <main className="landing-main">
        <div className="assessment-layout">
          <section className="feature-card">
            <h2>Benefits Assessment</h2>
            <p>
              This tool is educational only and is not legal, financial,
              medical, or VA-accredited advice.
            </p>

            <form onSubmit={handleSubmit}>
              <label>First Name</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) =>
                  setForm({ ...form, first_name: e.target.value })
                }
              />

              <label>Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />

              <label>State</label>
              <input
                type="text"
                placeholder="California, Texas, Florida..."
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />

              <label>Service Branch</label>
              <select
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

              <label>VA Disability Rating (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="10"
                value={form.disability_rating}
                onChange={(e) =>
                  setForm({ ...form, disability_rating: e.target.value })
                }
              />

              <label>GI Bill Percentage</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.gi_bill_percent}
                onChange={(e) =>
                  setForm({ ...form, gi_bill_percent: e.target.value })
                }
              />

              <label>Number of Dependents</label>
              <input
                type="number"
                min="0"
                value={form.dependents}
                onChange={(e) =>
                  setForm({ ...form, dependents: e.target.value })
                }
              />

              <label className="checkbox-line">
                <input
                  type="checkbox"
                  checked={form.employed}
                  onChange={(e) =>
                    setForm({ ...form, employed: e.target.checked })
                  }
                />
                Currently Employed
              </label>

              <label className="checkbox-line">
                <input
                  type="checkbox"
                  checked={form.interested_in_vre}
                  onChange={(e) =>
                    setForm({ ...form, interested_in_vre: e.target.checked })
                  }
                />
                Interested in VR&E
              </label>

              <label className="checkbox-line">
                <input
                  type="checkbox"
                  checked={form.interested_in_ssdi}
                  onChange={(e) =>
                    setForm({ ...form, interested_in_ssdi: e.target.checked })
                  }
                />
                Interested in SSDI
              </label>

              <button className="primary-btn" type="submit">
                Generate Benefits Report
              </button>
            </form>

            {message && <h3>{message}</h3>}
          </section>

          <section>
            {!results && (
              <div className="feature-card">
                <h2>Your report will appear here</h2>
                <p>
                  After submission, this area will show your opportunity score,
                  estimated compensation, ranked benefit areas, and recommended
                  next steps.
                </p>
              </div>
            )}

            {results && (
              <>
                <button className="primary-btn" onClick={downloadPDF}>
                  Download PDF Report
                </button>

                <div ref={reportRef} className="report-area">
                  <div className="feature-card">
                    <h2>
                      {form.first_name
                        ? `${form.first_name}'s Estimated Benefits Report`
                        : "Your Estimated Benefits Report"}
                    </h2>
                    <p>
                      Educational estimate only. Verify official amounts and
                      eligibility with VA.gov, SSA, state agencies, or an
                      accredited representative.
                    </p>
                  </div>

                  <div className="feature-card">
                    <h3>Benefits Opportunity Score</h3>
                    <div className="large-score">{results.score}/100</div>
                    <p>
                      This score estimates how many benefit areas may be worth
                      reviewing based on the information entered.
                    </p>
                  </div>

                  <div className="feature-card">
                    <h3>Estimated VA Disability Compensation</h3>
                    <p>
                      <strong>Rating used:</strong> {results.roundedRating}%
                    </p>
                    <p>
                      <strong>Estimated monthly value:</strong>{" "}
                      {currency(results.estimatedMonthly)}
                    </p>
                    <p>
                      <strong>Estimated annual value:</strong>{" "}
                      {currency(results.estimatedAnnual)}
                    </p>
                    <p>
                      <strong>Priority:</strong> {results.disabilityPriority}
                    </p>
                  </div>

                  <div className="feature-card">
                    <h3>Ranked Benefit Opportunities</h3>
                    <ol>
                      {results.rankedBenefits.map((benefit) => (
                        <li key={benefit.name}>
                          <strong>{benefit.name}</strong> — {benefit.priority}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="feature-card">
                    <h3>State-Specific Benefits</h3>
                    <p>
                      <strong>State entered:</strong>{" "}
                      {form.state || "Not provided"}
                    </p>
                    <ul>
                      {results.stateBenefits.map((benefit) => (
                        <li key={benefit}>{benefit}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="feature-card">
                    <h3>Recommended Action Plan</h3>
                    <ol>
                      <li>Verify your current combined rating on VA.gov.</li>
                      <li>
                        Confirm all dependents are added to your VA profile.
                      </li>
                      <li>
                        Compare VR&E before using more GI Bill entitlement.
                      </li>
                      <li>Review state-specific veteran benefits.</li>
                      <li>
                        Download your benefits letters and rating decision
                        letters.
                      </li>
                      <li>
                        Talk to a VSO or accredited representative before
                        complex claims.
                      </li>
                    </ol>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default AssessmentPage;