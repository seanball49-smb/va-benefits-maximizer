import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      first_name,
      email,
      state,
      service_branch,
      disability_rating,
      gi_bill_percent,
      dependents,
      employed,
      interested_in_vre,
      interested_in_ssdi,
    } = req.body;

    await resend.emails.send({
      from: "VA Benefits Maximizer <onboarding@resend.dev>",
      to: "seanball49@icloud.com",
      subject: "New VA Benefits Maximizer Lead",
      html: `
        <h2>New VA Benefits Maximizer Lead</h2>
        <p><strong>Name:</strong> ${first_name || "Not provided"}</p>
        <p><strong>Email:</strong> ${email || "Not provided"}</p>
        <p><strong>State:</strong> ${state || "Not provided"}</p>
        <p><strong>Service Branch:</strong> ${service_branch || "Not provided"}</p>
        <p><strong>VA Rating:</strong> ${disability_rating || 0}%</p>
        <p><strong>GI Bill:</strong> ${gi_bill_percent || 0}%</p>
        <p><strong>Dependents:</strong> ${dependents || 0}</p>
        <p><strong>Employed:</strong> ${employed ? "Yes" : "No"}</p>
        <p><strong>Interested in VR&E:</strong> ${interested_in_vre ? "Yes" : "No"}</p>
        <p><strong>Interested in SSDI:</strong> ${interested_in_ssdi ? "Yes" : "No"}</p>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Email error:", error);
    return res.status(500).json({ error: "Failed to send email" });
  }
}