import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function LandingPage() {
  const [leadCount, setLeadCount] = useState(0);

  useEffect(() => {
    async function loadLeadCount() {
      const { data } = await supabase.from("assessments").select("id");
      setLeadCount(data?.length || 0);
    }

    loadLeadCount();
  }, []);

  return (
    <div className="site-page">
      <header className="modern-hero">
        <nav className="modern-nav">
          <Link to="/" className="modern-logo">
          <span className="logo-mark">VA</span>
            <span>VA Benefits Maximizer</span>
          </Link>

          <div className="modern-nav-links">
            <a href="#how-it-works">How it works</a>
            <a href="#sample-report">Sample report</a>
            <Link className="nav-cta" to="/app">
              Start free
            </Link>
          </div>
        </nav>

        <section className="hero-shell">
          <div className="hero-copy">
            <div className="pill">Free veteran benefits assessment</div>

            <h1>
              Find the VA benefits you may be leaving on the table.
            </h1>

            <p>
              Get a personalized benefits snapshot covering VA disability,
              dependents, GI Bill, VR&E, SSDI considerations, and state veteran
              programs in about two minutes.
            </p>

            <div className="hero-buttons">
              <Link className="btn btn-primary" to="/app">
                Start My Free Assessment
              </Link>

              <a className="btn btn-secondary" href="#sample-report">
                View Sample Report
              </a>
            </div>

            <div className="hero-proof">
              <div>
                <strong>{leadCount}</strong>
                <span>Veterans assessed</span>
              </div>

              <div>
                <strong>2 min</strong>
                <span>Average completion</span>
              </div>

              <div>
                <strong>$0</strong>
                <span>No signup required</span>
              </div>
            </div>
          </div>

          <div className="hero-dashboard">
            <div className="floating-card score-card">
              <span>Benefits Opportunity Score</span>
              <strong>92</strong>
              <small>/100</small>
            </div>

            <div className="floating-card">
              <h3>Top Opportunities</h3>
              <ul>
                <li>VR&E review</li>
                <li>State benefits</li>
                <li>Dependent compensation</li>
              </ul>
            </div>

            <div className="floating-card compensation-card">
              <span>Estimated Monthly Value</span>
              <strong>$2,297</strong>
              <small>Educational estimate</small>
            </div>
          </div>
        </section>
      </header>

      <main>
        <section className="section feature-section">
          <div className="section-heading">
            <span className="pill light">What it checks</span>
            <h2>One assessment. Multiple benefit categories.</h2>
            <p>
              The app helps veterans identify benefit areas worth reviewing
              before they miss deadlines, leave money unused, or burn education
              benefits unnecessarily.
            </p>
          </div>

          <div className="modern-grid three">
            <div className="modern-card">
              <div className="icon-bubble">01</div>
              <h3>VA Disability</h3>
              <p>
                Estimate compensation opportunities, dependent add-ons, and
                rating-based next steps.
              </p>
            </div>

            <div className="modern-card">
              <div className="icon-bubble">02</div>
              <h3>Education Benefits</h3>
              <p>
                Review GI Bill and VR&E considerations before choosing a school
                or degree path.
              </p>
            </div>

            <div className="modern-card">
              <div className="icon-bubble">03</div>
              <h3>State Programs</h3>
              <p>
                Surface state-level tax, tuition, DMV, and veteran assistance
                programs.
              </p>
            </div>
          </div>
        </section>

        <section id="sample-report" className="section sample-section">
          <div className="sample-panel">
            <div>
              <span className="pill light">Sample output</span>
              <h2>A clean benefits report you can actually use.</h2>
              <p>
                Each report gives a score, estimated compensation, ranked
                opportunities, state benefits, and recommended action steps.
              </p>

              <Link className="btn btn-primary" to="/app">
                Generate My Report
              </Link>
            </div>

            <div className="sample-report-card">
              <div className="report-topline">
                <span>Opportunity Score</span>
                <strong>92/100</strong>
              </div>

              <div className="report-line">
                <span>VA Disability</span>
                <strong>High</strong>
              </div>

              <div className="report-line">
                <span>VR&E</span>
                <strong>High</strong>
              </div>

              <div className="report-line">
                <span>State Benefits</span>
                <strong>Review</strong>
              </div>

              <div className="report-line">
                <span>Estimated Monthly Value</span>
                <strong>$2,297</strong>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="section">
          <div className="section-heading">
            <span className="pill light">How it works</span>
            <h2>Simple enough to finish during a coffee break.</h2>
          </div>

          <div className="modern-grid three">
            <div className="step-card">
              <span>1</span>
              <h3>Answer questions</h3>
              <p>Enter your rating, dependents, state, education status, and goals.</p>
            </div>

            <div className="step-card">
              <span>2</span>
              <h3>Generate report</h3>
              <p>Receive a personalized benefits opportunity summary instantly.</p>
            </div>

            <div className="step-card">
              <span>3</span>
              <h3>Take action</h3>
              <p>Use the action plan to verify benefits with official sources.</p>
            </div>
          </div>
        </section>

        <section className="section cta-section">
          <h2>Ready to see what you may qualify for?</h2>
          <p>
            The assessment is free, fast, and educational. No account required.
          </p>

          <Link className="btn btn-primary" to="/app">
            Start My Free Assessment
          </Link>
        </section>
      </main>

      <footer className="modern-footer">
        <p>
          Educational estimates only. Not legal, financial, medical, or
          VA-accredited advice. Verify benefits with VA.gov, SSA, state agencies,
          or an accredited representative.
        </p>
      </footer>
    </div>
  );
}

export default LandingPage;