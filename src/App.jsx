import './App.css';
import React, { useState } from 'react';
import { importAESKey, decryptFile } from './utils/crypto';
import { publicKeyPem } from './publicKey';
import * as jose from "jose";

function App() {
  const [status, setStatus] = useState("Idle")

  async function handleFiles(event) {
    const files = event.target.files;
    const licenseFile = [...files].find(f => f.name.endsWith(".json"));
    
    if (!licenseFile) {
      alert("Please upload license file");
      return;
    }

    try {
      setStatus("Reading License...");
      const licenseText = await licenseFile.text();
      const licenseData = JSON.parse(licenseText);
      
      const publicKey = await jose.importSPKI(publicKeyPem, "RS256");
      const { payload } = await jose.jwtVerify(licenseData.license, publicKey);
      
      const hexKey = payload.key;
      const key = await importAESKey(hexKey);

      setStatus("Decrypting book...");
      const encryptedEpubBuffer = Uint8Array.from(atob(licenseData.encrypted_epub), c => c.charCodeAt(0));
      
      const iv = encryptedEpubBuffer.slice(0, 16);
      const encryptedContent = encryptedEpubBuffer.slice(16);
      
      const decrypted = await decryptFile(encryptedContent, key, iv);
      const epubBlob = new Blob([decrypted], {type: "application/epub+zip"});
      
      setStatus("Success!");
    } catch (err) {
      alert("Failed to load book");
      setStatus("Error");
    }
  }

  return (
    <div>
      <h1>Secure EPUB Reader</h1>
      <p>Status: {status}</p>
      <input type="file" onChange={handleFiles} />
      <div id="viewer" style={{ height: "600px" }}></div>
    </div>
  );
}

export default App;
