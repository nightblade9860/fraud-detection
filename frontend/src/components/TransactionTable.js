const TransactionTable = ({ transactions, title, isSuspiciousTable }) => {
  return (
    <div style={{ flex: 1, margin: "10px" }}>
      <h2 style={{ textAlign: "center" }}>{title}</h2>
      <table style={{ borderCollapse: "collapse", width: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <thead>
          <tr style={{ backgroundColor: "#f2f2f2" }}>
            <th>ID</th>
            <th>User</th>
            {isSuspiciousTable ? <th>Reason</th> : <>
              <th>Amount</th>
              <th>Currency</th>
              <th>Status</th>
              <th>Created At</th>
            </>}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, idx) => (
            <tr key={tx.transaction_id} style={{ backgroundColor: (tx.suspicious || isSuspiciousTable) ? "#ffcccc" : "#ccffcc" }}>
              <td>{tx.transaction_id}</td>
              <td>{tx.user_id}</td>
              {isSuspiciousTable ? (
                <td>{Array.isArray(tx.reason) ? tx.reason.join(", ") : tx.reason}</td>
              ) : (
                <>
                  <td>{tx.amount}</td>
                  <td>{tx.currency}</td>
                  <td>{tx.suspicious ? "Suspicious" : "OK"}</td>
                  <td>{tx.created_at ? new Date(isNaN(Number(tx.created_at)) ? tx.created_at : Number(tx.created_at) * 1000).toLocaleString() : ""}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionTable;
