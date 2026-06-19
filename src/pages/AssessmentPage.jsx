import { useRef, useState } from "react";
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

const totalSteps = 5;

function currency(value) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function AssessmentPage() {
  const reportRef = useRef(null);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    first_name: "",
    email: "",
    state: "",
    service_branch: "",
    disability_rating: 0,
    gi_bill_percent: 0,
    dependents: "",
    employed: false,
    interested_in_vre: false,
    interested_in_ssdi: false,
  });

  const [message, setMessage] = useState("");
  const [results, setResults] = useState(null);
  const [stateBenefitRows, setStateBenefitRows] = useState([]);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const progressPercent = Math.round((step / totalSteps) * 100);

  const fetchStateBenefits = async (stateName) => {
    const cleanedState = stateName.trim();
    if (!cleanedState) return [];

    const { data, error } = await supabase
      .from("state_benefits")
      .select("benefit_name, description, link")
      .ilike("state", cleanedState);

    if (error) {
      console.error("State benefits error:", error);
      return [];
    }

    return data || [];
  };

  const calculateResults = (benefitRows) => {
    const rating = Number(form.disability_rating);
    const giBill = Number(form.gi_bill_percent);
    const dependents = Number(form.dependents);

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
    if (benefitRows.length > 0) score += 15;
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
          priority: benefitRows.length > 0 ? "High" : "Review",
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
      disabilityPriority:
        roundedRating >= 70 ? "High" : roundedRating >= 30 ? "Medium" : "Low",
    };
  };

  const canContinue = () => {
    if (step === 1) return form.first_name && form.email;
    if (step === 2) return form.state && form.service_branch;
    if (step === 3) return form.dependents !== "";
    return true;
  };

  const nextStep = () => {
    if (!canContinue()) {
      setMessage("Please complete the required fields before continuing.");
      return;
    }

    setMessage("");
    setStep((prev) => Math.min(totalSteps, prev + 1));
  };

  const previousStep = () => {
    setMessage("");
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("Generating report...");

    const benefits = await fetchStateBenefits(form.state);
    setStateBenefitRows(benefits);

    const calculated = calculateResults(benefits);

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
    <div className="site-page">
      <header className="app-header">
        <nav className="modern-nav">
          <Link to="/" className="modern-logo">
            <span className="logo-mark">VA</span>
            <span>VA Benefits Maximizer</span>
          </Link>

          <div className="modern-nav-links">
            <Link to="/">Home</Link>
            <Link className="nav-cta" to="/app">
              Assessment
            </Link>
          </div>
        </nav>

        <div className="app-hero">
          <div>
            <div className="pill">Free benefits assessment</div>
            <h1>Generate your personalized benefits report.</h1>
            <p>
              Answer a few guided questions and get an educational benefits
              snapshot with estimated compensation, ranked opportunities, state
              benefits, and next steps.
            </p>
          </div>

          <div className="app-hero-card">
            <span>Current step</span>
            <strong>
              {step} of {totalSteps}
            </strong>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="assessment-modern-layout">
          <section className="wizard-card">
            <div className="wizard-top">
              <span>Step {step} of {totalSteps}</span>
              <strong>{progressPercent}% complete</strong>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <form onSubmit={handleSubmit}>
              {step === 1 && (
                <div className="wizard-step">
                  <h2>Basic information</h2>
                  <p>
                    We’ll use this to personalize your report and save the lead.
                  </p>

                  <label>First Name</label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => updateForm("first_name", e.target.value)}
                    placeholder="Sean"
                  />

                  <label>Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
              )}

              {step === 2 && (
                <div className="wizard-step">
                  <h2>Service profile</h2>
                  <p>
                    This helps match your report to state and service-related
                    benefits.
                  </p>

                  <label>State</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => updateForm("state", e.target.value)}
                    placeholder="California"
                  />

                  <label>Service Branch</label>
                  <div className="option-grid">
                    {[
                      "Air Force",
                      "Army",
                      "Navy",
                      "Marine Corps",
                      "Coast Guard",
                      "Space Force",
                    ].map((branch) => (
                      <button
                        key={branch}
                        type="button"
                        className={
                          form.service_branch === branch
                            ? "option-card selected"
                            : "option-card"
                        }
                        onClick={() => updateForm("service_branch", branch)}
                      >
                        {branch}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="wizard-step">
                  <h2>VA disability profile</h2>
                  <p>Enter your current combined rating and dependent count.</p>

                  <label>VA Disability Rating</label>
                  <div className="slider-card">
                    <div className="slider-value">
                      {form.disability_rating || 0}%
                    </div>

                    <input
                      className="range-input"
                      type="range"
                      min="0"
                      max="100"
                      step="10"
                      value={form.disability_rating || 0}
                      onChange={(e) =>
                        updateForm("disability_rating", e.target.value)
                      }
                    />

                    <div className="range-labels">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <label>Number of Dependents</label>
                  <input
                    type="number"
                    min="0"
                    value={form.dependents}
                    onChange={(e) => updateForm("dependents", e.target.value)}
                    placeholder="3"
                  />
                </div>
              )}

              {step === 4 && (
                <div className="wizard-step">
                  <h2>Education benefits</h2>
                  <p>
                    Compare GI Bill usage against VR&E before committing
                    benefits.
                  </p>

                  <label>GI Bill Eligibility</label>
                  <div className="slider-card">
                    <div className="slider-value">
                      {form.gi_bill_percent || 0}%
                    </div>

                    <input
                      className="range-input"
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={form.gi_bill_percent || 0}
                      onChange={(e) =>
                        updateForm("gi_bill_percent", e.target.value)
                      }
                    />

                    <div className="range-labels">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div className="toggle-stack">
                    <button
                      type="button"
                      className={
                        form.interested_in_vre
                          ? "toggle-card selected"
                          : "toggle-card"
                      }
                      onClick={() =>
                        updateForm(
                          "interested_in_vre",
                          !form.interested_in_vre
                        )
                      }
                    >
                      <span>Interested in VR&E</span>
                      <strong>{form.interested_in_vre ? "Yes" : "No"}</strong>
                    </button>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="wizard-step">
                  <h2>Work and SSDI considerations</h2>
                  <p>
                    This helps flag whether SSDI should be reviewed carefully.
                  </p>

                  <div className="toggle-stack">
                    <button
                      type="button"
                      className={
                        form.employed ? "toggle-card selected" : "toggle-card"
                      }
                      onClick={() => updateForm("employed", !form.employed)}
                    >
                      <span>Currently Employed</span>
                      <strong>{form.employed ? "Yes" : "No"}</strong>
                    </button>

                    <button
                      type="button"
                      className={
                        form.interested_in_ssdi
                          ? "toggle-card selected"
                          : "toggle-card"
                      }
                      onClick={() =>
                        updateForm(
                          "interested_in_ssdi",
                          !form.interested_in_ssdi
                        )
                      }
                    >
                      <span>Interested in SSDI</span>
                      <strong>{form.interested_in_ssdi ? "Yes" : "No"}</strong>
                    </button>
                  </div>
                </div>
              )}

              {message && <div className="form-message">{message}</div>}

              <div className="wizard-actions">
                {step > 1 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={previousStep}
                  >
                    Back
                  </button>
                )}

                {step < totalSteps && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={nextStep}
                  >
                    Continue
                  </button>
                )}

                {step === totalSteps && (
                  <button type="submit" className="btn btn-primary">
                    Generate Benefits Report
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="results-panel">
            {!results && (
              <div className="empty-report-card">
                <div className="pill light">Report preview</div>
                <h2>Your report will appear here.</h2>
                <p>
                  Once generated, you’ll see your opportunity score, estimated
                  compensation, ranked benefits, state-specific benefits, and
                  recommended next actions.
                </p>

                <div className="preview-skeleton">
                  <div />
                  <div />
                  <div />
                </div>
              </div>
            )}

            {results && (
              <>
                <button className="btn btn-primary" onClick={downloadPDF}>
                  Download PDF Report
                </button>

                <div ref={reportRef} className="report-dashboard">
                  <div className="report-header-card">
                    <span>Personalized Benefits Report</span>
                    <h2>
                      {form.first_name
                        ? `${form.first_name}'s Benefits Snapshot`
                        : "Your Benefits Snapshot"}
                    </h2>
                    <p>
                      Educational estimate only. Verify official amounts and
                      eligibility with VA.gov, SSA, state agencies, or an
                      accredited representative.
                    </p>
                  </div>

                  <div className="report-stat-grid">
                    <div>
                      <span>Opportunity Score</span>
                      <strong>{results.score}/100</strong>
                    </div>

                    <div>
                      <span>Monthly Estimate</span>
                      <strong>{currency(results.estimatedMonthly)}</strong>
                    </div>

                    <div>
                      <span>Annual Estimate</span>
                      <strong>{currency(results.estimatedAnnual)}</strong>
                    </div>

                    <div>
                      <span>Rating Used</span>
                      <strong>{results.roundedRating}%</strong>
                    </div>
                  </div>

                  <div className="report-section-card">
                    <h3>Ranked Benefit Opportunities</h3>
                    <div className="opportunity-list">
                      {results.rankedBenefits.map((benefit) => (
                        <div key={benefit.name}>
                          <span>{benefit.name}</span>
                          <strong>{benefit.priority}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="report-section-card">
                    <h3>State-Specific Benefits</h3>
                    <p>
                      <strong>State entered:</strong>{" "}
                      {form.state || "Not provided"}
                    </p>

                    {stateBenefitRows.length > 0 ? (
                      <div className="state-benefit-list">
                        {stateBenefitRows.map((benefit) => (
                          <div key={benefit.benefit_name}>
                            <h4>{benefit.benefit_name}</h4>
                            {benefit.description && (
                              <p>{benefit.description}</p>
                            )}
                            {benefit.link && (
                              <a
                                href={benefit.link}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Learn more
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>
                        State-specific benefits are not loaded for this state
                        yet. Check your state veterans affairs website.
                      </p>
                    )}
                  </div>

                  <div className="report-section-card">
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