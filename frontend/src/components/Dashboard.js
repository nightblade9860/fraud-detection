import { useEffect, useState } from "react";
import { fetchTransactions, fetchSuspicious, generateData, sendEmail, applyRules } from "../services/api";
import TransactionTable from "./TransactionTable";
import EmailForm from "./EmailForm";

const Dashboard = () => {
  const [allTx, setAllTx] = useState([]);
  const [suspiciousTx, setSuspiciousTx] = useState([]);
  const [selectedRules, setSelectedRules] = useState([]);

  const RULE_OPTIONS = [
    { value: "high_amount", label: "High Amount" },
    { value: "foreign_currency", label: "Foreign Currency" },
    { value: "banned_region", label: "Payment from banned regions" }
  ];

  const loadTransactions = async () => {
    const all = await fetchTransactions();
    const suspicious = await fetchSuspicious();
    setAllTx(all);             
    setSuspiciousTx(suspicious);
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleApplyRules = async () => {
    const filtered = await applyRules(selectedRules);

    setAllTx(filtered.all);
    setSuspiciousTx(filtered.suspicious);
  };

  const handleGenerate = async () => {
    await generateData();
    setSelectedRules([]);  
    loadTransactions();
  };


  const handleSendEmail = async (email) => {
    const isSuccess = await sendEmail(email);
    if (isSuccess){
      alert("Email sent! Please check spam");
    } else {
      alert("Email not sent! Please retry");
    }
    
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ textAlign: "center", marginBottom: "30px" }}>Fraud Detection Dashboard</h1>
      
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <button 
            onClick={handleGenerate} 
            style={{
                backgroundColor: "#4CAF50",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                marginBottom: "20px"
            }}
            >
            Generate Data
        </button>
        <EmailForm 
          onSend={handleSendEmail} 
          disabled={suspiciousTx.length === 0} 
        />
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label style={{ fontWeight: "bold", display: "block", marginBottom: "10px" }}>
          Apply Fraud Rules:
        </label>
        
        <div style={{ marginBottom: "10px" }}>
          {RULE_OPTIONS.map(rule => (
            <label key={rule.value} style={{ display: "block", marginBottom: "5px" }}>
              <input
                type="checkbox"
                value={rule.value}
                checked={selectedRules.includes(rule.value)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedRules([...selectedRules, rule.value]);
                  } else {
                    setSelectedRules(selectedRules.filter(r => r !== rule.value));
                  }
                }}
              />
              {rule.label}
            </label>
          ))}
        </div>

        <button
          onClick={handleApplyRules}
          style={{
            backgroundColor: "#2196F3",
            color: "white",
            padding: "8px 15px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          Apply
        </button>
      </div>

      <div style={{ display: "flex", gap: "20px" }}>
        <div style={{ flex: 1 }}>
          <TransactionTable transactions={allTx} title="All Transactions" isSuspiciousTable={false} />
        </div>
        <div style={{ flex: 1 }}>
          <TransactionTable transactions={suspiciousTx} title="Suspicious Transactions" isSuspiciousTable={true} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
