import { Link } from "react-router-dom";

function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-hero">
        <nav className="landing-nav">
          <div className="brand">VA Benefits Maximizer</div>
          <div className="nav-links">
            <Link to="/app">Start Assessment</Link>
            <Link to="/admin">Admin</Link>
          </div>
        </nav>

        <section className="hero-content">
          <div>
            <p className="eyebrow">Veteran Benefits Planning Tool</p>
            <h1>Discover Veteran Benefits You May Be Missing</h1>
            <p className="hero-subtitle">
              Get a free personalized benefits assessment covering VA disability,
              GI Bill, VR&E, state programs, dependent benefits, and SSDI
              considerations.
            </p>

            <div className="hero-actions">
              <Link className="primary-btn" to="/app">
                Start Free Assessment
              </Link>
              <a className="secondary-btn" href="#sample-report">
                View Sample Report
              </a>
            </div>
          </div>

          <div className="score-preview">
            <p>Sample Benefits Opportunity Score</p>
            <div className="score-number">92</div>
            <span>/100</span>
          </div>
        </section>
      </header>

      <main className="landing-main">
        <section className="feature-grid">
          <div className="feature-card">
            <h3>VA Disability</h3>
            <p>Estimate compensation opportunities and dependent add-ons.</p>
          </div>

          <div className="feature-card">
            <h3>Education Benefits</h3>
            <p>Compare GI Bill and VR&E considerations before using benefits.</p>
          </div>

          <div className="feature-card">
            <h3>State Benefits</h3>
            <p>Identify state-level programs like tuition, DMV, and tax benefits.</p>
          </div>
        </section>

        <section className="how-it-works">
          <h2>How It Works</h2>

          <div className="steps-grid">
            <div>
              <span>1</span>
              <h3>Complete Assessment</h3>
              <p>Answer a short questionnaire in about two minutes.</p>
            </div>

            <div>
              <span>2</span>
              <h3>Generate Report</h3>
              <p>Receive a personalized benefits opportunity summary.</p>
            </div>

            <div>
              <span>3</span>
              <h3>Take Action</h3>
              <p>Use the recommended next steps to verify and pursue benefits.</p>
            </div>
          </div>
        </section>

        <section id="sample-report" className="sample-report">
          <h2>Sample Report Preview</h2>
          <div className="sample-card">
            <h3>Estimated VA Disability Compensation</h3>
            <p><strong>Rating used:</strong> 80%</p>
            <p><strong>Estimated monthly value:</strong> $2,297.15</p>
            <p><strong>Priority:</strong> High</p>
          </div>
        </section>

        <section className="faq">
          <h2>FAQ</h2>
          <h3>Is this free?</h3>
          <p>Yes. The basic assessment is free.</p>

          <h3>Is this official VA advice?</h3>
          <p>No. This is educational only and not legal, financial, medical, or VA-accredited advice.</p>

          <h3>How long does it take?</h3>
          <p>About two minutes.</p>
        </section>
      </main>

      <footer className="landing-footer">
        <p>Educational estimates only. Verify benefits with VA.gov, SSA, state agencies, or an accredited representative.</p>
      </footer>
    </div>
  );
}

export default LandingPage;