import './App.css';
import React, { useState } from 'react';
import { verifyLicense } from './verifyLicense';

function App() {

  const [token, setToken] = useState('');
  const [result, setResult] = useState(null);

  const handleVerify = async () => {
    const res = await verifyLicense(token.trim());
    setResult(res);
  };

  return (
    <div style={{padding: '2rem'}}>
      <h1>Offline License Verifier</h1>
      <textarea 
        placeholder='Past License (JWT)'
        rows={6}
        cols={60}
        value={token}
        onChange={e => setToken(e.target.value)}
      />
      <br />
      <button onClick={handleVerify}>Verify</button>
      {result && (
        <div>
          {result.valid? (
            <pre>{JSON.stringify(result.payload, null, 2)}</pre>
          ) : (
            <p style={{color:'red'}}>Invalid license: {result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
