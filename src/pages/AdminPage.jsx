import { Link } from "react-router-dom";

function AdminPage() {
  return (
    <div style={{ padding: "40px" }}>
      <Link to="/">← Back to Home</Link>
      <h1>Admin Dashboard</h1>
      <p>Admin dashboard will be separated here next.</p>
    </div>
  );
}

export default AdminPage;