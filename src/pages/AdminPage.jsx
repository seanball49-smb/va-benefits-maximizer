import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function AdminPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    setLoading(true);

    const { data, error } = await supabase
      .from("assessments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setLeads(data || []);
    setLoading(false);
  }

  const stats = useMemo(() => {
    const total = leads.length;

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    const thisWeek = leads.filter((lead) => {
      if (!lead.created_at) return false;
      return new Date(lead.created_at) >= sevenDaysAgo;
    }).length;

    const averageRating =
      total > 0
        ? Math.round(
            leads.reduce(
              (sum, lead) => sum + Number(lead.disability_rating || 0),
              0
            ) / total
          )
        : 0;

    const averageGiBill =
      total > 0
        ? Math.round(
            leads.reduce(
              (sum, lead) => sum + Number(lead.gi_bill_percent || 0),
              0
            ) / total
          )
        : 0;

    const stateCounts = {};
    const ratingCounts = {};

    leads.forEach((lead) => {
      const state = lead.state || "Unknown";
      stateCounts[state] = (stateCounts[state] || 0) + 1;

      const rating = `${lead.disability_rating || 0}%`;
      ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
    });

    const mostCommonState =
      Object.entries(stateCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "N/A";

    return {
      total,
      thisWeek,
      averageRating,
      averageGiBill,
      stateCounts,
      ratingCounts,
      mostCommonState,
    };
  }, [leads]);

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Lead Analytics</p>
          <h1>Admin Dashboard</h1>
          <p>
            Track assessments, veteran leads, state demand, and benefits profile
            trends.
          </p>
        </div>

        <div className="admin-actions">
          <Link className="secondary-btn" to="/">
            Home
          </Link>
          <Link className="primary-btn" to="/app">
            Assessment
          </Link>
        </div>
      </header>

      <main className="admin-main">
        {loading && <div className="feature-card">Loading dashboard...</div>}

        {!loading && (
          <>
            <section className="admin-stats-grid">
              <div className="admin-stat-card">
                <span>Total Assessments</span>
                <strong>{stats.total}</strong>
              </div>

              <div className="admin-stat-card">
                <span>This Week</span>
                <strong>{stats.thisWeek}</strong>
              </div>

              <div className="admin-stat-card">
                <span>Average VA Rating</span>
                <strong>{stats.averageRating}%</strong>
              </div>

              <div className="admin-stat-card">
                <span>Avg. GI Bill</span>
                <strong>{stats.averageGiBill}%</strong>
              </div>

              <div className="admin-stat-card">
                <span>Top State</span>
                <strong>{stats.mostCommonState}</strong>
              </div>
            </section>

            <section className="admin-grid">
              <div className="feature-card">
                <h2>Assessments by State</h2>
                <div className="bar-list">
                  {Object.entries(stats.stateCounts).map(([state, count]) => (
                    <div className="bar-row" key={state}>
                      <div className="bar-label">
                        <span>{state}</span>
                        <strong>{count}</strong>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${Math.max(
                              8,
                              (count / stats.total) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="feature-card">
                <h2>Rating Distribution</h2>
                <div className="bar-list">
                  {Object.entries(stats.ratingCounts)
                    .sort(
                      ([a], [b]) =>
                        Number(a.replace("%", "")) -
                        Number(b.replace("%", ""))
                    )
                    .map(([rating, count]) => (
                      <div className="bar-row" key={rating}>
                        <div className="bar-label">
                          <span>{rating}</span>
                          <strong>{count}</strong>
                        </div>
                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{
                              width: `${Math.max(
                                8,
                                (count / stats.total) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </section>

            <section className="feature-card">
              <div className="table-header">
                <h2>Recent Leads</h2>
                <button className="primary-btn" onClick={loadLeads}>
                  Refresh
                </button>
              </div>

              <div className="lead-table-wrapper">
                <table className="lead-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>State</th>
                      <th>Branch</th>
                      <th>Rating</th>
                      <th>GI Bill</th>
                      <th>Dependents</th>
                      <th>Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id}>
                        <td>{lead.first_name || "—"}</td>
                        <td>{lead.email || "—"}</td>
                        <td>{lead.state || "—"}</td>
                        <td>{lead.service_branch || "—"}</td>
                        <td>{lead.disability_rating || 0}%</td>
                        <td>{lead.gi_bill_percent || 0}%</td>
                        <td>{lead.dependents || 0}</td>
                        <td>
                          {lead.created_at
                            ? new Date(lead.created_at).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default AdminPage;