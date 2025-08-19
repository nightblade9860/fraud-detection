import { useState } from "react";

const EmailForm = ({ onSend, disabled }) => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || disabled) return;
    onSend(email);
    setEmail("");
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "10px" }}>
      <input
        type="email"
        placeholder="Enter email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", flex: 1 }}
      />
      <button
        type="submit"
        disabled={disabled}
        title={disabled ? "Cannot send mail, no suspicious transactions present" : ""}
        style={{
          padding: "8px 16px",
          backgroundColor: disabled ? "#aaa" : "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Send Email
      </button>
    </form>
  );
};

export default EmailForm;
