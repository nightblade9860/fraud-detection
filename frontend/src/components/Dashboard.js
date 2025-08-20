import { useEffect, useState } from "react";
import { fetchTransactions, fetchSuspicious, generateData, sendEmail, applyRules } from "../services/api";
import TransactionTable from "./TransactionTable";
import EmailForm from "./EmailForm";

const Dashboard = () => {
  const [allTx, setAllTx] = useState([]);
  const [suspiciousTx, setSuspiciousTx] = useState([]);
  const [selectedRules, setSelectedRules] = useState([]);

  const [customRuleEnabled, setCustomRuleEnabled] = useState(false);
  const [customField, setCustomField] = useState("");
  const [customOperator, setCustomOperator] = useState("");
  const [customValue, setCustomValue] = useState("");

  const RULE_OPTIONS = [
    { value: "high_amount", label: "High Amount" },
    { value: "foreign_currency", label: "Foreign Currency" },
    { value: "banned_region", label: "Payment from banned regions" }
  ];

  const FIELD_OPTIONS = [
    { value: "transaction_id", label: "ID" },
    { value: "user_id", label: "User" },
    { value: "amount", label: "Amount" },
    { value: "currency", label: "Currency" }
  ];

  const OPERATOR_OPTIONS = {
    default: [
      { value: "=", label: "Equals" },
      { value: "!=", label: "Not Equals" }
    ],
    amount: [
      { value: "=", label: "Equals" },
      { value: "!=", label: "Not Equals" },
      { value: ">", label: "Greater Than" },
      { value: "<", label: "Less Than" }
    ]
  };

  const CURRENCY_OPTIONS = ["USD", "AED", "EUR", "INR", "GBP"];

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
    let finalRules = [...selectedRules];

    if (customRuleEnabled && customField && customOperator && customValue) {
      const customRuleStr = `${customField} ${customOperator} ${customValue}`;
      finalRules.push(customRuleStr);
    }

    const filtered = await applyRules(finalRules);

    setAllTx(filtered.all);
    setSuspiciousTx(filtered.suspicious);
  };

  const handleGenerate = async () => {
    const isSuccess = await generateData();
    if (!isSuccess){
      alert("Generation failed, please retry!");
      return;
    }
    setSelectedRules([]);
    setCustomRuleEnabled(false);
    setCustomField("");
    setCustomOperator("");
    setCustomValue("");
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

  const isApplyDisabled =
    (customRuleEnabled && (!customField || !customOperator || !customValue));

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
            <label key={rule.value} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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

        {/* Custom Rule */}
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="checkbox"
              checked={customRuleEnabled}
              onChange={(e) => setCustomRuleEnabled(e.target.checked)}
            />
            Custom Rule
          </label>

          {customRuleEnabled && (
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              {/* Field */}
              <select
                value={customField}
                onChange={(e) => {
                  setCustomField(e.target.value);
                  setCustomOperator("");
                  setCustomValue("");
                }}
              >
                <option value="" disabled hidden>Select Field</option>
                {FIELD_OPTIONS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>

              {/* Operator */}
              <select
                value={customOperator}
                onChange={(e) => setCustomOperator(e.target.value)}
                disabled={!customField}
              >
                <option value="" disabled hidden>Select Operator</option>
                {(customField === "amount" ? OPERATOR_OPTIONS.amount : OPERATOR_OPTIONS.default).map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>

              {/* Value */}
              {customField === "currency" ? (
                <select
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  disabled={!customOperator}
                >
                  <option value="" disabled hidden>Select Currency</option>
                  {CURRENCY_OPTIONS.map(cur => (
                    <option key={cur} value={cur}>{cur}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={customField === "amount" ? "number" : "text"}
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  disabled={!customOperator}
                />
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleApplyRules}
          disabled={isApplyDisabled}
          style={{
            backgroundColor: isApplyDisabled ? "grey" : "#2196F3",
            color: "white",
            padding: "8px 15px",
            border: "none",
            borderRadius: "5px",
            cursor: isApplyDisabled ? "not-allowed" : "pointer"
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
